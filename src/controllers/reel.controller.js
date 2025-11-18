// src/controllers/reel.controller.js
import fs from "node:fs/promises";
import httpStatus from "http-status";
import AppError from "#utils/appError";
import BaseController from "#controllers/base";
import ReelService from "#services/reel";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import {
  generateThumbnail,
  getVideoDurationInSeconds,
  uploadToStorage,
  uploadThumbnailFile,
} from "#utils/reel";

import User from "#models/user";
import UserFollow from "#models/userFollow";
import ReelComment from "#models/reelComment";
import ReelLike from "#models/reelLike";
import ReelShare from "#models/reelShare";
import ReelView from "#models/reelView";
import ReelWasHere from "#models/reelWasHere";
import Reel from "#models/reel";

import { Op } from "sequelize";
import UserBlockService from "#services/userBlock";

class ReelController extends BaseController {
  static Service = ReelService;
  static allowedVisibilities = new Set(["public", "followers", "private"]);
  static allowedStatuses = new Set(["active", "suspended", "inactive"]);

  // full include for responses
  static fullInclude = [
    {
      model: User,
      as: "user",
      attributes: ["id", "name", "username", "profile", "isPrivate"],
    },
    {
      model: ReelComment,
      as: "comments",
      include: [
        {
          model: User,
          as: "commentUser",
          attributes: ["id", "username", "profile"],
        },
      ],
    },
    { model: ReelLike, as: "likes" },
    { model: ReelShare, as: "shares" },
    { model: ReelView, as: "views" },
    { model: ReelWasHere, as: "wasHere" },
  ];

  // ---------------------- Helpers ----------------------
  static parseNumber(value) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  static parseTaggedUserIds(value) {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed))
        throw new Error("taggedUserIds must be an array");
      return parsed;
    } catch (error) {
      throw new AppError({
        message: "Invalid taggedUserIds format",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }
  }

  static parsePagination(query) {
    let page = Number(query.page) || 1;
    let limit = Number(query.limit) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    return { page, limit };
  }

  static buildReelListWhere(query = {}) {
    const where = {};

    // userId filter
    const userId = query.userId ?? query.user;
    if (userId !== undefined) {
      const id = Number(userId);
      if (!Number.isNaN(id)) where.userId = id;
    }

    // visibility filter (allow comma separated list)
    if (query.visibility) {
      const vis = String(query.visibility)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (vis.length && !vis.includes("all")) {
        where.visibility = vis.length === 1 ? vis[0] : { [Op.in]: vis };
      }
    }

    // musicId and filterId exact match
    if (query.musicId) where.musicId = String(query.musicId);
    if (query.filterId) where.filterId = String(query.filterId);

    // search in caption
    const search = String(query.search || "").trim();
    if (search) {
      where.caption = { [Op.iLike]: `%${search}%` };
    }

    // taggedUserId in taggedUserIds JSONB array
    if (query.taggedUserId) {
      const taggedId = Number(query.taggedUserId);
      if (!Number.isNaN(taggedId)) {
        where.taggedUserIds = { [Op.contains]: [taggedId] };
      }
    }

    // status filter
    if (query.status) {
      const status = String(query.status).split(",").map((s) => s.trim()).filter(Boolean);
      if (status.length && !status.includes("all")) {
        where.status = status.length === 1 ? status[0] : { [Op.in]: status };
      }
    }

    return where;
  }

  static buildReelSort(query = {}) {
    const allowed = new Set(["createdAt", "wasHereCount", "id"]);
    const requested = String(query.sortBy || "").trim();
    const sortBy = allowed.has(requested) ? requested : "createdAt";
    const sortOrder = String(query.sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
    return [[sortBy, sortOrder]];
  }

  /**
   * Attach count fields to a reel or array of reels
   * Mutates the reel object(s) to add: commentsCount, likesCount, sharesCount, viewsCount, wasHereCount (already exists, but ensures it)
   */
  static attachReelCounts(reel) {
    if (!reel) return reel;
    if (Array.isArray(reel)) {
      return reel.map((r) => this.attachReelCounts(r));
    }
    // Convert to plain object if needed
    const data = reel.toJSON ? reel.toJSON() : reel;
    data.commentsCount = Array.isArray(data.comments) ? data.comments.length : 0;
    data.likesCount = Array.isArray(data.likes) ? data.likes.length : 0;
    data.sharesCount = Array.isArray(data.shares) ? data.shares.length : 0;
    data.viewsCount = Array.isArray(data.views) ? data.views.length : 0;
    data.wasHereCount = Number(data.wasHereCount) || 0;
    return data;
  }

  static getCurrentUserId(req) {
    return (
      session.get("userId") ??
      req.user?.userId ??
      session.get("payload")?.userId ??
      null
    );
  }

  static isAdmin(req) {
    return !!(
      session.get("isAdmin") ??
      req.user?.isAdmin ??
      session.get("payload")?.isAdmin
    );
  }

  // follower check unchanged
  static async isFollower(viewerId, ownerId, blockedIds = null) {
    if (!viewerId) return false;
    let blockedList =
      blockedIds ?? (await UserBlockService.getBlockedUserIdsFor(viewerId));
    blockedList = blockedList ?? [];
    if (blockedList.includes(ownerId)) return false;
    const follow = await UserFollow.findOne({
      where: { userId: viewerId, otherId: ownerId },
    });
    return !!follow;
  }

  /**
   * Central permission logic for a reel *including status rules*.
   * - active: subject to visibility rules
   * - inactive: only owner OR admin
   * - suspended: only admin
   */
  static async canViewReel(reel, viewerId, req = null) {
    const isAdmin = req ? this.isAdmin(req) : false;

    // If suspended -> only admin
    if (reel.status === "suspended") return isAdmin;

    // If inactive -> only owner or admin
    if (reel.status === "inactive") {
      if (isAdmin) return true;
      return viewerId && Number(viewerId) === Number(reel.userId);
    }

    // Now handle active + visibility rules
    const owner =
      typeof reel.getUser === "function"
        ? await reel.getUser()
        : await User.findByPk(reel.userId);
    if (!owner) return false;
    const isOwner = viewerId && Number(viewerId) === Number(reel.userId);
    if (isOwner) return true;

    let blockedIds = [];
    if (viewerId) {
      blockedIds = await UserBlockService.getBlockedUserIdsFor(viewerId);
      if (blockedIds.includes(owner.id)) return false;
    }
    const isAccountPrivate = !!owner.isPrivate;
    const isFollower = await this.isFollower(viewerId, owner.id, blockedIds);

    if (reel.visibility === "private") return false;
    if (reel.visibility === "followers") return isFollower;
    if (reel.visibility === "public") return !isAccountPrivate || isFollower;
    return false;
  }

  // ---------------------- CRUD & Feeds ----------------------

  // GET single reel
  static async get(req, res) {
    const { id } = req.params;
    if (!id)
      throw new AppError({
        message: "Reel id is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });

    const reel = await Reel.findByPk(id, { include: this.fullInclude });
    if (!reel)
      throw new AppError({
        message: "Reel not found",
        httpStatus: httpStatus.NOT_FOUND,
      });

    const currentUserId = this.getCurrentUserId(req);
    const canView = await this.canViewReel(reel, currentUserId, req);
    if (!canView)
      throw new AppError({
        message: "You are not allowed to view this reel",
        httpStatus: httpStatus.FORBIDDEN,
      });

    sendResponse(httpStatus.OK, res, reel, "Reel fetched successfully");
  }

  // CREATE reel (unchanged)
  static async create(req, res) {
    const files = req.files ?? [];
    const userId = this.getCurrentUserId(req);
    if (!userId)
      throw new AppError({
        message: "Unauthorized: missing user context",
        httpStatus: httpStatus.UNAUTHORIZED,
      });

    const videoFile = files.find((file) => file.fieldname === "video");
    const thumbnailFile = files.find((file) => file.fieldname === "thumbnail");
    if (!videoFile || !videoFile.path)
      throw new AppError({
        message: "Video file is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });

    const videoPath = videoFile.path;
    const thumbnailPath = thumbnailFile?.path;

    const cleanupTempFile = async () => {
      if (!videoPath) return;
      try {
        await fs.unlink(videoPath);
      } catch (e) {}
      if (thumbnailPath) {
        try {
          await fs.unlink(thumbnailPath);
        } catch (e) {}
      }
    };

    try {
      const duration = await getVideoDurationInSeconds(videoPath);
      if (duration > 30)
        throw new AppError({
          message: "Video must be 30 seconds or less",
          httpStatus: httpStatus.BAD_REQUEST,
        });

      const videoUrl = await uploadToStorage(videoPath, videoFile.originalname);
      const thumbnailUrl = thumbnailPath
        ? await uploadThumbnailFile(thumbnailPath, thumbnailFile.originalname)
        : await generateThumbnail(videoPath);

      const payload = {
        userId,
        videoUrl,
        thumbnailUrl,
        caption: req.body.caption,
        musicId: req.body.musicId,
        filterId: req.body.filterId,
        locationLat: this.parseNumber(req.body.locationLat),
        locationLng: this.parseNumber(req.body.locationLng),
        locationName: req.body.locationName,
        taggedUserIds: this.parseTaggedUserIds(req.body.taggedUserIds),
        visibility: this.allowedVisibilities.has(req.body.visibility)
          ? req.body.visibility
          : "public",
        // status defaults to 'active' in DB
      };

      const reel = await this.Service.create(payload);
      sendResponse(httpStatus.CREATED, res, reel, "Reel uploaded successfully");
    } finally {
      await cleanupTempFile();
    }
  }

  // GET ALL (explore) — only active shown publicly
  static async getAll(req, res) {
    const { page, limit } = this.parsePagination(req.query);
    const where = this.buildReelListWhere(req.query) || {};
    const order = this.buildReelSort(req.query);

    // only active for public explore
    where.status = "active";

    const include = [...this.fullInclude];
    const includePrivateUsers =
      String(req.query.includePrivateUsers || "").toLowerCase() === "true";
    const userInclude = include.find((i) => i.as === "user");
    if (!includePrivateUsers) userInclude.where = { isPrivate: false };

    const data = await this.Service.findWithPagination({
      where,
      page,
      limit,
      include,
      order,
    });

    if (data && data.result) {
      data.result = this.attachReelCounts(data.result);
    }
    sendResponse(httpStatus.OK, res, data, "Reels fetched successfully");
  }

  // follower feed — only active reels from followed users
  static async getFollowerFeed(req, res) {
    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId)
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });

    const { page, limit } = this.parsePagination(req.query);

    const data = await this.Service.getFollowerFeed({
      userId: currentUserId,
      page,
      limit,
      include: this.fullInclude,
      where: { status: "active" },
    });

    if (data && data.result) {
      data.result = this.attachReelCounts(data.result);
    }
    sendResponse(
      httpStatus.OK,
      res,
      data,
      "Follower feed fetched successfully"
    );
  }

  // getByUserId — for profile listing: owners/admin see all statuses; others see only active
  static async getByUserId(req, res) {
    const { userId } = req.params;
    const userIdNum = Number(userId);
    if (!userId || Number.isNaN(userIdNum))
      throw new AppError({
        message: "Invalid userId",
        httpStatus: httpStatus.BAD_REQUEST,
      });

    const { page, limit } = this.parsePagination(req.query);
    const currentUserId = this.getCurrentUserId(req);
    const isOwner =
      currentUserId && Number(currentUserId) === Number(userIdNum);
    const isAdmin = this.isAdmin(req);

    const owner = await User.findByPk(userIdNum);
    if (!owner)
      throw new AppError({
        message: "User not found",
        httpStatus: httpStatus.NOT_FOUND,
      });

    // permissions for private/followers handled below via visibility and canViewReel per reel;
    // For listing we filter status unless owner/admin.
    const statusFilter = isOwner || isAdmin ? undefined : "active";

    const data = await this.Service.getByUserIdWithPagination({
      userId: userIdNum,
      page,
      limit,
      visibility: undefined, // preserve current visibility logic inside service; we rely on where/status here
      include: this.fullInclude,
      where: statusFilter ? { status: statusFilter } : undefined,
    });

    if (data && data.result) {
      data.result = this.attachReelCounts(data.result);
    }
    sendResponse(httpStatus.OK, res, data, "User reels fetched successfully");
  }

  // nearby / heatmap / private / followers pages — ensure status filtering when public
  static async getNearby(req, res) {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusParam = Number(req.query.radius);
    if ([lat, lng].some((v) => Number.isNaN(v)))
      throw new AppError({
        message: "lat and lng required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    const radius =
      !Number.isNaN(radiusParam) && radiusParam > 0 ? radiusParam : 50;
    const { page, limit } = this.parsePagination(req.query);

    const data = await this.Service.getNearbyReels({
      lat,
      lng,
      radius,
      page,
      limit,
      include: this.fullInclude,
      where: { status: "active" },
    });
    if (data && data.result) {
      data.result = this.attachReelCounts(data.result);
    }
    sendResponse(httpStatus.OK, res, data, "Nearby reels fetched successfully");
  }

  static async getHeatmap(req, res) {
    const bounds = this.parseBounds(req.query);
    const bucketSizeParam = Number(req.query.bucketSize);
    const bucketSize =
      !Number.isNaN(bucketSizeParam) && bucketSizeParam > 0
        ? bucketSizeParam
        : 0.5;

    const data = await this.Service.getHeatmapData({ bounds, bucketSize });
    sendResponse(httpStatus.OK, res, data, "Heatmap data fetched successfully");
  }

  // updateInfo — prevent editing if status not active (unless admin)
  static async updateInfo(req, res) {
    const { id } = req.params;
    if (!id)
      throw new AppError({
        message: "Reel id is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId)
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });

    const reel = await this.Service.getDocById(id);
    if (!reel)
      throw new AppError({
        message: "Reel not found",
        httpStatus: httpStatus.NOT_FOUND,
      });

    const isAdmin = this.isAdmin(req);
    if (Number(reel.userId) !== Number(currentUserId) && !isAdmin) {
      throw new AppError({
        message: "You are not allowed to update this reel",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    // If user trying to edit and reel not active -> forbid
    if (!isAdmin && reel.status !== "active") {
      throw new AppError({
        message: "You cannot edit a suspended or inactive reel",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    const updatePayload = {};
    const {
      caption,
      musicId,
      filterId,
      locationLat,
      locationLng,
      locationName,
      taggedUserIds,
      visibility,
    } = req.body;
    if (caption !== undefined) updatePayload.caption = caption;
    if (musicId !== undefined) updatePayload.musicId = musicId;
    if (filterId !== undefined) updatePayload.filterId = filterId;
    if (locationLat !== undefined)
      updatePayload.locationLat = this.parseNumber(locationLat);
    if (locationLng !== undefined)
      updatePayload.locationLng = this.parseNumber(locationLng);
    if (locationName !== undefined) updatePayload.locationName = locationName;
    if (taggedUserIds !== undefined)
      updatePayload.taggedUserIds = this.parseTaggedUserIds(taggedUserIds);
    if (visibility !== undefined) {
      if (!this.allowedVisibilities.has(visibility))
        throw new AppError({
          message: "Invalid visibility value",
          httpStatus: httpStatus.BAD_REQUEST,
        });
      updatePayload.visibility = visibility;
    }

    const updatedReel = await this.Service.update(id, updatePayload);
    sendResponse(httpStatus.OK, res, updatedReel, "Reel updated successfully");
  }

  // delete (user) — only owner or admin; if normal user, mark deleted via status -> inactive
  static async delete(req, res) {
    const { id } = req.params;
    if (!id)
      throw new AppError({
        message: "Reel id is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId)
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });

    const reel = await this.Service.getDocById(id);
    if (!reel)
      throw new AppError({
        message: "Reel not found",
        httpStatus: httpStatus.NOT_FOUND,
      });

    const isAdmin = this.isAdmin(req);
    if (Number(reel.userId) !== Number(currentUserId) && !isAdmin)
      throw new AppError({
        message: "You are not allowed to delete this reel",
        httpStatus: httpStatus.FORBIDDEN,
      });

    if (isAdmin) {
      // admin full delete via service
      await reel.destroy();
    } else {
      // user soft-hide -> set inactive
      await this.Service.update(id, { status: "inactive" });
    }

    sendResponse(httpStatus.OK, res, null, "Reel deleted successfully");
  }

  // toggleWasHere - ensure viewer can interact with reel (will check status via canViewReel)
  static async toggleWasHere(req, res) {
    const reelId = Number(req.params.id);
    if (!reelId)
      throw new AppError({
        message: "Reel id is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });

    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId)
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });

    const reel = await this.Service.getDocById(reelId);
    if (!reel)
      throw new AppError({
        message: "Reel not found",
        httpStatus: httpStatus.NOT_FOUND,
      });

    const canView = await this.canViewReel(reel, currentUserId, req);
    if (!canView)
      throw new AppError({
        message: "You are not allowed to interact with this reel",
        httpStatus: httpStatus.FORBIDDEN,
      });

    const existing = await ReelWasHere.findOne({
      where: { userId: currentUserId, reelId },
    });
    let userHasMarked = false;
    if (existing) await existing.destroy();
    else {
      await ReelWasHere.create({ userId: currentUserId, reelId });
      userHasMarked = true;
    }

    const wasHereCount = await ReelWasHere.count({ where: { reelId } });
    reel.wasHereCount = wasHereCount;
    await reel.save();

    sendResponse(
      httpStatus.OK,
      res,
      { reelId, wasHereCount, userHasMarked },
      "WasHere updated"
    );
  }

  // private / followers listing (owner/admin will get status included by service call)
  static async getAllPrivate(req, res) {
    const { page, limit } = this.parsePagination(req.query);
    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId)
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });

    const data = await this.Service.getByVisibilityWithPagination({
      visibility: "private",
      userId: currentUserId,
      page,
      limit,
      include: this.fullInclude,
    });
    if (data && data.result) {
      data.result = this.attachReelCounts(data.result);
    }
    sendResponse(
      httpStatus.OK,
      res,
      data,
      "Private reels fetched successfully"
    );
  }

  static async getAllFollowers(req, res) {
    const { page, limit } = this.parsePagination(req.query);
    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId)
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });

    const data = await this.Service.getByVisibilityWithPagination({
      visibility: "followers",
      userId: currentUserId,
      page,
      limit,
      include: this.fullInclude,
      where: { status: "active" },
    });
    if (data && data.result) {
      data.result = this.attachReelCounts(data.result);
    }
    sendResponse(
      httpStatus.OK,
      res,
      data,
      "Followers reels fetched successfully"
    );
  }
}

export default ReelController;
