import httpStatus from "http-status";
import AppError from "#utils/appError";
import BaseController from "#controllers/base";
import PostService from "#services/post";
import PostWasHere from "#models/postWasHere";
import User from "#models/user";
import UserFollow from "#models/userFollow";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import { Op } from "sequelize";
import UserBlockService from "#services/userBlock";

class PostController extends BaseController {
  static Service = PostService;

  static allowedVisibilities = new Set(["public", "followers", "private"]);

  // ---------- helpers ----------

  static parseNumber(value) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  static parseTaggedUserIds(value) {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        throw new Error("taggedUserIds must be an array");
      }
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

  static buildDateRangeFilter(query) {
    const { startDate, endDate } = query;
    const filter = {};

    if (startDate) {
      const parsed = new Date(startDate);
      if (!Number.isNaN(parsed.getTime())) {
        filter[Op.gte] = parsed;
      }
    }

    if (endDate) {
      const parsed = new Date(endDate);
      if (!Number.isNaN(parsed.getTime())) {
        filter[Op.lte] = parsed;
      }
    }

    return Object.keys(filter).length ? filter : null;
  }

  static buildPostListWhere(query) {
    const where = {};
    const defaultVisibility = "public";

    if (!query.visibility) {
      where.visibility = defaultVisibility;
    } else {
      const vis = String(query.visibility)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (
        vis.length &&
        !(vis.length === 1 && vis[0].toLowerCase() === "all")
      ) {
        where.visibility =
          vis.length === 1 ? vis[0] : { [Op.in]: vis };
      }
    }

    if (query.userId) {
      const id = Number(query.userId);
      if (!Number.isNaN(id)) {
        where.userId = id;
      }
    }

    const dateFilter = this.buildDateRangeFilter(query);
    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    const search = String(query.search || "").trim();
    if (search) {
      where.caption = {
        [Op.iLike]: `%${search}%`,
      };
    }

    return where;
  }

  static buildPostSort(query) {
    const allowed = new Set(["createdAt", "wasHereCount"]);
    const requested = String(query.sortBy || "").trim();
    const sortBy = allowed.has(requested) ? requested : "createdAt";

    const order =
      String(query.sortOrder || "").toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";

    return [[sortBy, order]];
  }

  static parseBounds(query) {
    const neLat = Number(query.ne_lat ?? query.neLat);
    const neLng = Number(query.ne_lng ?? query.neLng);
    const swLat = Number(query.sw_lat ?? query.swLat);
    const swLng = Number(query.sw_lng ?? query.swLng);

    if (
      [neLat, neLng, swLat, swLng].some(
        (val) => val === undefined || Number.isNaN(val),
      )
    ) {
      throw new AppError({
        message:
          "Invalid bounds. Provide ne_lat, ne_lng, sw_lat and sw_lng query params",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    return {
      northEast: { lat: neLat, lng: neLng },
      southWest: { lat: swLat, lng: swLng },
    };
  }

  static getCurrentUserId(req) {
    return (
      session.get("userId") ??
      req.user?.userId ??
      session.get("payload")?.userId ??
      null
    );
  }

  static async isFollower(viewerId, ownerId, blockedIds = null) {
    if (!viewerId) return false;

    let blockedList = blockedIds ?? null;
    if (blockedList === null) {
      blockedList = await UserBlockService.getBlockedUserIdsFor(viewerId);
    }
    blockedList = blockedList ?? [];

    if (blockedList.includes(ownerId)) {
      return false;
    }

    const follow = await UserFollow.findOne({
      where: {
        userId: viewerId,
        otherId: ownerId,
      },
    });

    return !!follow;
  }

  static async canViewPost(post, viewerId) {
    const owner =
      typeof post.getUser === "function"
        ? await post.getUser()
        : await User.findByPk(post.userId);

    if (!owner) return false;

    const isOwner = viewerId && Number(viewerId) === Number(post.userId);
    if (isOwner) return true;

    let blockedIds = [];
    if (viewerId) {
      blockedIds = await UserBlockService.getBlockedUserIdsFor(viewerId);
      if (blockedIds.includes(owner.id)) {
        return false;
      }
    }

    const isAccountPrivate = !!owner.isPrivate;
    const isFollower = await this.isFollower(viewerId, owner.id, blockedIds);

    if (post.visibility === "private") {
      return false;
    }

    if (post.visibility === "followers") {
      return isFollower;
    }

    if (post.visibility === "public") {
      if (!isAccountPrivate) return true;
      return isFollower;
    }

    return false;
  }

  // ---------- single post ----------

  static async get(req, res) {
    const { id } = req.params;
    if (!id) {
      throw new AppError({
        message: "Post id is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const post = await this.Service.getDocById(id);
    if (!post) {
      throw new AppError({
        message: "Post not found",
        httpStatus: httpStatus.NOT_FOUND,
      });
    }

    const currentUserId = this.getCurrentUserId(req);
    const canView = await this.canViewPost(post, currentUserId);

    if (!canView) {
      throw new AppError({
        message: "You are not allowed to view this post",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    sendResponse(httpStatus.OK, res, post, "Post fetched successfully");
  }

  // ---------- create ----------

  static async create(req, res) {
    const userId = this.getCurrentUserId(req);

    if (!userId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const files = req.files ?? [];
    const hasImageFile = files.some((file) => file.fieldname === "image");
    const bodyImage = req.body.image;

    const payload = {
      userId,
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
    };

    if (bodyImage) {
      payload.image = bodyImage;
    } else if (!hasImageFile) {
      throw new AppError({
        message: "Image is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const post = await this.Service.create(payload);
    sendResponse(httpStatus.CREATED, res, post, "Post created successfully");
  }

  // ---------- explore feed ----------

  static async getAll(req, res) {
    const { page, limit } = this.parsePagination(req.query);
    const where = this.buildPostListWhere(req.query);
    const order = this.buildPostSort(req.query);

    const include = [];
    const includePrivateUsers =
      String(req.query.includePrivateUsers || "").toLowerCase() === "true";

    const userInclude = {
      model: User,
      attributes: ["id", "name", "username", "email", "profile", "isPrivate"],
    };

    if (!includePrivateUsers) {
      userInclude.where = { isPrivate: false };
    }

    include.push(userInclude);

    const data = await this.Service.findWithPagination({
      where,
      page,
      limit,
      include,
      order,
    });

    sendResponse(httpStatus.OK, res, data, "Posts fetched successfully");
  }

  static async getFollowerFeed(req, res) {
    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const { page, limit } = this.parsePagination(req.query);

    const data = await this.Service.getFollowerFeed({
      userId: currentUserId,
      page,
      limit,
    });

    sendResponse(httpStatus.OK, res, data, "Follower feed fetched successfully");
  }

  static async getByUserId(req, res) {
    const { userId } = req.params;
    const userIdNum = Number(userId);
    if (!userId || Number.isNaN(userIdNum)) {
      throw new AppError({
        message: "Invalid userId",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const { page, limit } = this.parsePagination(req.query);
    const currentUserId = this.getCurrentUserId(req);

    const owner = await User.findByPk(userIdNum);
    if (!owner) {
      throw new AppError({
        message: "User not found",
        httpStatus: httpStatus.NOT_FOUND,
      });
    }

    const isOwner =
      currentUserId && Number(currentUserId) === Number(userIdNum);

    let blockedIds = [];
    if (!isOwner && currentUserId) {
      blockedIds = await UserBlockService.getBlockedUserIdsFor(currentUserId);
      if (blockedIds.includes(owner.id)) {
        throw new AppError({
          message: "You are not allowed to view this user's posts",
          httpStatus: httpStatus.FORBIDDEN,
        });
      }
    }

    const isAccountPrivate = !!owner.isPrivate;
    const isFollower = await this.isFollower(currentUserId, owner.id, blockedIds);

    let visibilityFilter;

    if (isOwner) {
      visibilityFilter = undefined;
    } else if (isAccountPrivate) {
      if (!isFollower) {
        throw new AppError({
          message: "You are not allowed to view this user's posts",
          httpStatus: httpStatus.FORBIDDEN,
        });
      }
      visibilityFilter = ["public", "followers"];
    } else {
      visibilityFilter = isFollower ? ["public", "followers"] : ["public"];
    }

    const data = await this.Service.getByUserIdWithPagination({
      userId: userIdNum,
      page,
      limit,
      visibility: visibilityFilter,
    });

    sendResponse(httpStatus.OK, res, data, "User posts fetched successfully");
  }

  static async getAllPrivate(req, res) {
    const { page, limit } = this.parsePagination(req.query);
    const currentUserId = this.getCurrentUserId(req);

    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const data = await this.Service.getByVisibilityWithPagination({
      visibility: "private",
      userId: currentUserId,
      page,
      limit,
    });

    sendResponse(httpStatus.OK, res, data, "Private posts fetched successfully");
  }

  static async getAllFollowers(req, res) {
    const { page, limit } = this.parsePagination(req.query);
    const currentUserId = this.getCurrentUserId(req);

    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const data = await this.Service.getByVisibilityWithPagination({
      visibility: "followers",
      userId: currentUserId,
      page,
      limit,
    });

    sendResponse(
      httpStatus.OK,
      res,
      data,
      "Followers-only posts fetched successfully",
    );
  }

  static async updateInfo(req, res) {
    const { id } = req.params;
    if (!id) {
      throw new AppError({
        message: "Post id is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const post = await this.Service.getDocById(id);
    if (!post) {
      throw new AppError({
        message: "Post not found",
        httpStatus: httpStatus.NOT_FOUND,
      });
    }

    if (Number(post.userId) !== Number(currentUserId)) {
      throw new AppError({
        message: "You are not allowed to update this post",
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
      if (!this.allowedVisibilities.has(visibility)) {
        throw new AppError({
          message: "Invalid visibility value",
          httpStatus: httpStatus.BAD_REQUEST,
        });
      }
      updatePayload.visibility = visibility;
    }

    const updatedPost = await this.Service.updateDocById(id, updatePayload);

    sendResponse(httpStatus.OK, res, updatedPost, "Post updated successfully");
  }

  static async delete(req, res) {
    const { id } = req.params;
    if (!id) {
      throw new AppError({
        message: "Post id is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const post = await this.Service.getDocById(id);
    if (!post) {
      throw new AppError({
        message: "Post not found",
        httpStatus: httpStatus.NOT_FOUND,
      });
    }

    if (Number(post.userId) !== Number(currentUserId)) {
      throw new AppError({
        message: "You are not allowed to delete this post",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    await this.Service.deleteDocById(id);
    sendResponse(httpStatus.OK, res, null, "Post deleted successfully");
  }

  static async toggleWasHere(req, res) {
    const { id } = req.params;
    const postId = Number(id);
    if (!postId) {
      throw new AppError({
        message: "Post id is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const post = await this.Service.getDocById(postId);
    if (!post) {
      throw new AppError({
        message: "Post not found",
        httpStatus: httpStatus.NOT_FOUND,
      });
    }

    const canView = await this.canViewPost(post, currentUserId);
    if (!canView) {
      throw new AppError({
        message: "You are not allowed to interact with this post",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    const existing = await PostWasHere.findOne({
      where: { userId: currentUserId, postId },
    });

    let userHasMarked = false;

    if (existing) {
      await existing.destroy();
    } else {
      await PostWasHere.create({ userId: currentUserId, postId });
      userHasMarked = true;
    }

    const wasHereCount = await PostWasHere.count({ where: { postId } });
    post.wasHereCount = wasHereCount;
    await post.save();

    sendResponse(
      httpStatus.OK,
      res,
      { postId, wasHereCount, userHasMarked },
      "Was here updated successfully",
    );
  }

  static async getHeatmap(req, res) {
    const bounds = this.parseBounds(req.query);
    const bucketSizeParam = Number(req.query.bucketSize);
    const bucketSize =
      !Number.isNaN(bucketSizeParam) && bucketSizeParam > 0
        ? bucketSizeParam
        : 0.5;

    const data = await this.Service.getHeatmapData({
      bounds,
      bucketSize,
    });

    sendResponse(httpStatus.OK, res, data, "Heatmap data fetched successfully");
  }

  static async getNearby(req, res) {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusParam = Number(req.query.radius);

    if ([lat, lng].some((val) => Number.isNaN(val))) {
      throw new AppError({
        message: "lat and lng query params are required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const radius =
      !Number.isNaN(radiusParam) && radiusParam > 0 ? radiusParam : 50;
    const { page, limit } = this.parsePagination(req.query);

    const data = await this.Service.getNearbyPosts({
      lat,
      lng,
      radius,
      page,
      limit,
    });

    sendResponse(httpStatus.OK, res, data, "Nearby posts fetched successfully");
  }
}

export default PostController;
