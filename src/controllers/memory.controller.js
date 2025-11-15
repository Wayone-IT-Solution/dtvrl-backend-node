import httpStatus from "http-status";
import AppError from "#utils/appError";
import MemoryService from "#services/memory";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import { session } from "#middlewares/requestSession";
import User from "#models/user";
import UserFollow from "#models/userFollow";
import UserBlockService from "#services/userBlock";
import { Op } from "sequelize";

class MemoryController extends BaseController {
  static Service = MemoryService;

  static privacyEnum = new Set(["private", "open_to_all"]);

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

  static async canViewMemory(memory, viewerId) {
    if (!memory) return false;

    const ownerId = memory.userId;
    if (!ownerId) return false;

    const isOwner =
      viewerId !== null && Number(viewerId) === Number(memory.userId);
    if (isOwner) return true;

    let blockedIds = [];
    if (viewerId) {
      blockedIds = await UserBlockService.getBlockedUserIdsFor(viewerId);
      if (blockedIds.includes(ownerId)) {
        return false;
      }
    }

    if (memory.privacy === "private") {
      return false;
    }

    const isFollower = await this.isFollower(viewerId, ownerId, blockedIds);
    return isFollower;
  }

  static parsePagination(query = {}) {
    let page = Number(query.page) || 1;
    let limit = Number(query.limit) || 10;

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    return { page, limit };
  }

  static buildDateRangeFilter(query = {}) {
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

  static buildMemoryWhere(query = {}) {
    const where = {};

    if (query.userId) {
      const id = Number(query.userId);
      if (!Number.isNaN(id)) {
        where.userId = id;
      }
    }

    if (query.privacy) {
      const privacy = String(query.privacy)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (privacy.length && !privacy.includes("all")) {
        where.privacy =
          privacy.length === 1 ? privacy[0] : { [Op.in]: privacy };
      }
    }

    const dateFilter = this.buildDateRangeFilter(query);
    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    const search = String(query.search || "").trim();
    if (search) {
      where.name = {
        [Op.iLike]: `%${search}%`,
      };
    }

    return where;
  }

  static buildMemorySort(query = {}) {
    const allowed = new Set(["createdAt", "startDate", "endDate"]);
    const requested = String(query.sortBy || "").trim();
    const sortBy = allowed.has(requested) ? requested : "createdAt";
    const sortOrder =
      String(query.sortOrder || "").toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";

    return [[sortBy, sortOrder]];
  }

  static parseBounds(query) {
    const neLat = Number(query.ne_lat ?? query.neLat);
    const neLng = Number(query.ne_lng ?? query.neLng);
    const swLat = Number(query.sw_lat ?? query.swLat);
    const swLng = Number(query.sw_lng ?? query.swLng);

    if (
      [neLat, neLng, swLat, swLng].every(
        (val) => val === undefined || Number.isNaN(val),
      )
    ) {
      return null; // no bounds provided
    }

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

  static async create(req, res, next) {
    const userId = this.getCurrentUserId(req);
    if (!userId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }
    req.body.userId = userId;
    return await super.create(req, res, next);
  }

  static async getMemories(req, res, next) {
    const { id } = req.params;
    if (id) {
      const folder = await this.Service.getDocById(id, {
        include: [
          {
            model: User,
            attributes: ["id", "name", "username", "profile", "email"],
          },
        ],
      });
      return sendResponse(
        httpStatus.OK,
        res,
        folder,
        "Memory folder fetched successfully",
      );
    }

    const payload = session.get("payload");
    const isAdmin = Boolean(payload?.isAdmin);
    const { page, limit } = this.parsePagination(req.query);
    const where = this.buildMemoryWhere(req.query);
    const order = this.buildMemorySort(req.query);

    if (!isAdmin) {
      const currentUserId = this.getCurrentUserId(req);
      if (!currentUserId) {
        throw new AppError({
          message: "Unauthorized",
          httpStatus: httpStatus.UNAUTHORIZED,
        });
      }
      where.userId = currentUserId;
    }

    const data = await this.Service.findWithPagination({
      where,
      page,
      limit,
      order,
      include: [
        {
          model: User,
          attributes: ["id", "name", "username", "profile", "email"],
        },
      ],
    });

    sendResponse(
      httpStatus.OK,
      res,
      data,
      "Memory folders fetched successfully",
    );
  }

  static async get(req, res, next) {
    const currentUserId = this.getCurrentUserId(req);
    const payload = session.get("payload");
    const isAdmin = Boolean(payload?.isAdmin);
    const { id } = req.params;

    if (!isAdmin) {
      if (!currentUserId) {
        throw new AppError({
          message: "Unauthorized",
          httpStatus: httpStatus.UNAUTHORIZED,
        });
      }
      req.query.userId = currentUserId;
    } else if (req.query.userId !== undefined) {
      const requestedId = Number(req.query.userId);
      if (!Number.isNaN(requestedId)) {
        req.query.userId = requestedId;
      } else {
        delete req.query.userId;
      }
    }

    const customOptions = {
      include: [
        {
          model: User,
          attributes: ["id", "name", "username", "email", "profile"],
        },
      ],
      order: [["createdAt", "DESC"]],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = id
      ? await this.Service.getDocById(id, customOptions)
      : await this.Service.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, data, "Memories fetched successfully");
  }

  static async getOne(req, res) {
    const { id } = req.params;
    if (!id) {
      throw new AppError({
        message: "Folder id is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const folder = await this.Service.getDocById(id);
    const currentUserId = this.getCurrentUserId(req);

    const canView = await this.canViewMemory(folder, currentUserId);
    if (!canView) {
      throw new AppError({
        message: "You are not allowed to view this folder",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    sendResponse(
      httpStatus.OK,
      res,
      folder,
      "Memory folder fetched successfully",
    );
  }

  static async updatePrivacy(req, res) {
    const { id } = req.params;
    const { privacy } = req.body || {};
    const currentUserId = this.getCurrentUserId(req);

    if (!id) {
      throw new AppError({
        message: "Folder id is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    if (!privacy || !this.privacyEnum.has(privacy)) {
      throw new AppError({
        message: "Invalid privacy value",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const folder = await this.Service.getDocById(id);
    if (Number(folder.userId) !== Number(currentUserId)) {
      throw new AppError({
        message: "You are not allowed to change privacy of this folder",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    folder.privacy = privacy;
    await folder.save();

    sendResponse(
      httpStatus.OK,
      res,
      folder,
      "Memory folder privacy updated successfully",
    );
  }

  static async listByUser(req, res) {
    const { userId } = req.params;
    const { page, limit } = this.parsePagination(req.query);
    const currentUserId = this.getCurrentUserId(req);

    const targetUserId = Number(userId);
    if (!userId || Number.isNaN(targetUserId)) {
      throw new AppError({
        message: "Invalid userId",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const owner = await User.findByPk(targetUserId);
    if (!owner) {
      throw new AppError({
        message: "User not found",
        httpStatus: httpStatus.NOT_FOUND,
      });
    }

    const isOwner =
      currentUserId !== null && Number(currentUserId) === owner.id;

    let where = { userId: owner.id };

    if (!isOwner) {
      if (!currentUserId) {
        throw new AppError({
          message: "Unauthorized",
          httpStatus: httpStatus.UNAUTHORIZED,
        });
      }

      const follower = await this.isFollower(currentUserId, owner.id);
      if (!follower) {
        const empty = this.Service.buildEmptyResult(page, limit);
        return sendResponse(
          httpStatus.OK,
          res,
          empty,
          "Memory folders fetched successfully",
        );
      }

      where = {
        ...where,
        privacy: "open_to_all",
      };
    }

    const data = await this.Service.findWithPagination({
      where,
      page,
      limit,
      order: [["startDate", "DESC"]],
    });

    sendResponse(
      httpStatus.OK,
      res,
      data,
      "Memory folders fetched successfully",
    );
  }

  static async listForMap(req, res) {
    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const { page, limit } = this.parsePagination(req.query);
    const bounds = this.parseBounds(req.query);

    const data = await this.Service.findForMapWithPrivacy({
      viewerId: currentUserId,
      page,
      limit,
      bounds,
    });

    sendResponse(
      httpStatus.OK,
      res,
      data,
      "Memory folders for map fetched successfully",
    );
  }

  static async listForTimeline(req, res) {
    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const { page, limit } = this.parsePagination(req.query);

    const data = await this.Service.findForTimelineWithPrivacy({
      viewerId: currentUserId,
      page,
      limit,
    });

    sendResponse(
      httpStatus.OK,
      res,
      data,
      "Memory folders for timeline fetched successfully",
    );
  }

  static async update(req, res, next) {
    const coverImageFromBody = req.body?.coverImage;
    const uploadedCover = req.files?.some(
      (file) => file.fieldname === "coverImage",
    );

    if (coverImageFromBody || uploadedCover) {
      throw new AppError({
        message: "Cover image cannot be updated after creation",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    return await super.update(req, res, next);
  }
}

export default MemoryController;
