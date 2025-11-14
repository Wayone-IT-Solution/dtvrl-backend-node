import httpStatus from "http-status";
import AppError from "#utils/appError";
import MemoryService from "#services/memory";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import { session } from "#middlewares/requestSession";
import User from "#models/user";
import UserFollow from "#models/userFollow";

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

  static async isFollower(viewerId, ownerId) {
    if (!viewerId) return false;

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

    if (memory.privacy === "private") {
      return false;
    }

    const isFollower = await this.isFollower(viewerId, ownerId);
    return isFollower;
  }

  static parsePagination(query = {}) {
    let page = Number(query.page) || 1;
    let limit = Number(query.limit) || 10;

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    return { page, limit };
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
    return await super.get(req, res, next);
  }

  static async get(req, res, next) {
    const userId = this.getCurrentUserId(req);
    if (!userId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }
    req.query.userId = userId;
    return await super.get(req, res, next);
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
