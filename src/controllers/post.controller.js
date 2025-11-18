// src/controllers/post.controller.js
import httpStatus from "http-status";
import AppError from "#utils/appError";
import BaseController from "#controllers/base";

import { Post } from "../models/index.js";

import User from "../models/user.model.js";
import UserFollow from "../models/userFollow.model.js";
import PostComment from "../models/postComment.model.js";
import PostLike from "../models/postLike.model.js";
import PostShare from "../models/postShare.model.js";
import PostView from "../models/postView.model.js";
import PostWasHere from "../models/postWasHere.model.js";

import PostService from "#services/post";
import UserBlockService from "#services/userBlock";

import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import { Op } from "sequelize";

class PostController extends BaseController {
  static Service = PostService;

  static allowedVisibilities = new Set(["public", "followers", "private"]);
  static allowedStatuses = new Set(["active", "suspended", "inactive"]);

  // ✔ Includes for all post data
  static fullIncludes = [
    {
      model: User,
      as: "user",
      attributes: ["id", "name", "username", "profile"],
    },
    {
      model: PostComment,
      as: "comments",
      include: [
        {
          model: User,
          as: "commentUser",
          attributes: ["id", "username", "profile"],
        },
      ],
    },
    {
      model: PostLike,
      as: "likes",
      include: [
        {
          model: User,
          as: "likeUser",
          attributes: ["id", "username", "profile"],
        },
      ],
    },
    {
      model: PostShare,
      as: "shares",
    },
    {
      model: PostView,
      as: "views",
    },
    {
      model: PostWasHere,
      as: "wasHere",
      include: [
        {
          model: User,
          as: "wasHereUser",
          attributes: ["id", "username", "profile"],
        },
      ],
    },
  ];

  // ----------------- helpers -----------------
  static parseNumber(value) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  static parseTaggedUserIds(value) {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) throw new Error();
      return parsed;
    } catch {
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

  static getCurrentUserId(req) {
    return (
      session.get("userId") ?? req.user?.userId ?? session.get("payload")?.userId ?? null
    );
  }

  static isAdmin(req) {
    return !!(session.get("isAdmin") ?? req.user?.isAdmin ?? session.get("payload")?.isAdmin);
  }

  /**
   * Attach count fields to a post or array of posts
   * Mutates the post object(s) to add: commentsCount, likesCount, sharesCount, viewsCount, wasHereCount
   */
  static attachPostCounts(post) {
    if (!post) return post;
    if (Array.isArray(post)) {
      return post.map((p) => this.attachPostCounts(p));
    }
    // Convert to plain object if needed
    const data = post.toJSON ? post.toJSON() : post;
    data.commentsCount = Array.isArray(data.comments) ? data.comments.length : 0;
    data.likesCount = Array.isArray(data.likes) ? data.likes.length : 0;
    data.sharesCount = Array.isArray(data.shares) ? data.shares.length : 0;
    data.viewsCount = Array.isArray(data.views) ? data.views.length : 0;
    data.wasHereCount = Array.isArray(data.wasHere) ? data.wasHere.length : 0;
    return data;
  }

  // ----------------- permission (status + visibility) ------------
  static async canViewPost(post, viewerId, req = null) {
    const isAdmin = req ? this.isAdmin(req) : false;

    // suspended -> only admin
    if (post.status === "suspended") return isAdmin;

    // inactive -> admin or owner
    if (post.status === "inactive") {
      if (isAdmin) return true;
      return viewerId && Number(viewerId) === Number(post.userId);
    }

    // active -> apply existing visibility rules
    const owner = await User.findByPk(post.userId);
    if (!owner) return false;

    const isOwner = viewerId && Number(viewerId) === Number(post.userId);
    if (isOwner) return true;

    const blocked = viewerId ? await UserBlockService.getBlockedUserIdsFor(viewerId) : [];
    if (blocked.includes(owner.id)) return false;

    const isFollower = await UserFollow.findOne({
      where: { userId: viewerId, otherId: owner.id },
    });

    if (post.visibility === "private") return false;
    if (post.visibility === "followers") return !!isFollower;

    return owner.isPrivate ? !!isFollower : true;
  }

  // ----------------- SINGLE POST -----------------
  static async get(req, res) {
    const { id } = req.params;

    const post = await Post.findByPk(id, {
      include: this.fullIncludes,
    });

    if (!post)
      throw new AppError({
        message: "Post not found",
        httpStatus: httpStatus.NOT_FOUND,
      });

    const userId = this.getCurrentUserId(req);

    if (!(await this.canViewPost(post, userId, req)))
      throw new AppError({
        message: "Not allowed to view this post",
        httpStatus: httpStatus.FORBIDDEN,
      });

    const postWithCounts = this.attachPostCounts(post);
    sendResponse(httpStatus.OK, res, postWithCounts, "Post fetched");
  }

  // ----------------- CREATE POST -----------------
  static async create(req, res) {
    const userId = this.getCurrentUserId(req);
    if (!userId)
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });

    const hasFile = req.files?.some((f) => f.fieldname === "image");
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
      // status defaults to 'active'
    };

    if (bodyImage) payload.image = bodyImage;
    else if (!hasFile)
      throw new AppError({
        message: "Image is required",
        httpStatus: 400,
      });

    const post = await this.Service.create(payload);

    sendResponse(httpStatus.CREATED, res, post, "Post created");
  }

  // ----------------- EXPLORE FEED -----------------
  static async getAll(req, res) {
    const { page, limit } = this.parsePagination(req.query);

    // only active posts in public explore
    const where = { status: "active" };

    const data = await this.Service.findWithPagination({
      where,
      page,
      limit,
      include: this.fullIncludes,
    });

    if (data && data.result) {
      data.result = this.attachPostCounts(data.result);
    }
    sendResponse(httpStatus.OK, res, data, "Posts fetched");
  }

  // ----------------- FOLLOWER FEED -----------------
  static async getFollowerFeed(req, res) {
    const userId = this.getCurrentUserId(req);
    if (!userId)
      throw new AppError({ message: "Unauthorized", httpStatus: httpStatus.UNAUTHORIZED });

    const { page, limit } = this.parsePagination(req.query);

    const data = await this.Service.getFollowerFeed({
      userId,
      page,
      limit,
      include: this.fullIncludes,
      where: { status: "active" },
    });

    if (data && data.result) {
      data.result = this.attachPostCounts(data.result);
    }
    sendResponse(httpStatus.OK, res, data, "Feed fetched");
  }

  // ----------------- GET BY USER -----------------
  static async getByUserId(req, res) {
    const { userId } = req.params;
    const currentId = this.getCurrentUserId(req);

    const { page, limit } = this.parsePagination(req.query);

    const isOwner = currentId && Number(currentId) === Number(userId);
    const isAdmin = this.isAdmin(req);

    const where = isOwner || isAdmin ? undefined : { status: "active" };

    const data = await this.Service.getByUserIdWithPagination({
      userId,
      page,
      limit,
      include: this.fullIncludes,
      where,
    });

    if (data && data.result) {
      data.result = this.attachPostCounts(data.result);
    }
    sendResponse(httpStatus.OK, res, data, "User posts fetched");
  }

  // ----------------- PRIVATE -----------------
  static async getAllPrivate(req, res) {
    const userId = this.getCurrentUserId(req);
    const { page, limit } = this.parsePagination(req.query);

    const data = await this.Service.getByVisibilityWithPagination({
      visibility: "private",
      userId,
      page,
      limit,
      include: this.fullIncludes,
    });

    if (data && data.result) {
      data.result = this.attachPostCounts(data.result);
    }
    sendResponse(httpStatus.OK, res, data, "Private posts fetched");
  }

  // ----------------- FOLLOWERS ONLY -----------------
  static async getAllFollowers(req, res) {
    const userId = this.getCurrentUserId(req);
    const { page, limit } = this.parsePagination(req.query);

    const data = await this.Service.getByVisibilityWithPagination({
      visibility: "followers",
      userId,
      page,
      limit,
      include: this.fullIncludes,
      where: { status: "active" },
    });

    if (data && data.result) {
      data.result = this.attachPostCounts(data.result);
    }
    sendResponse(httpStatus.OK, res, data, "Followers posts fetched");
  }

  // ----------------- UPDATE -----------------
  static async updateInfo(req, res) {
    const { id } = req.params;
    const userId = this.getCurrentUserId(req);

    const post = await Post.findByPk(id);
    if (!post) throw new AppError({ message: "Not found", httpStatus: 404 });

    const isAdmin = this.isAdmin(req);
    if (post.userId !== userId && !isAdmin)
      throw new AppError({ message: "Forbidden", httpStatus: 403 });

    if (!isAdmin && post.status !== "active")
      throw new AppError({ message: "You cannot edit a suspended or inactive post", httpStatus: 403 });

    const updateData = {};

    ["caption", "musicId", "filterId", "locationName"].forEach((k) => {
      if (req.body[k] !== undefined) updateData[k] = req.body[k];
    });

    if (req.body.locationLat) updateData.locationLat = this.parseNumber(req.body.locationLat);
    if (req.body.locationLng) updateData.locationLng = this.parseNumber(req.body.locationLng);
    if (req.body.taggedUserIds) updateData.taggedUserIds = this.parseTaggedUserIds(req.body.taggedUserIds);

    if (req.body.visibility && this.allowedVisibilities.has(req.body.visibility))
      updateData.visibility = req.body.visibility;

    await this.Service.updateDocById(id, updateData);

    sendResponse(httpStatus.OK, res, null, "Updated");
  }

  // ----------------- DELETE -----------------
  static async delete(req, res) {
    const { id } = req.params;
    const userId = this.getCurrentUserId(req);

    const post = await Post.findByPk(id);

    if (!post) throw new AppError({ message: "Not found", httpStatus: 404 });

    const isAdmin = this.isAdmin(req);
    if (post.userId !== userId && !isAdmin) throw new AppError({ message: "Forbidden", httpStatus: 403 });

    if (isAdmin) {
      await this.Service.deleteDocById(id);
    } else {
      await this.Service.updateDocById(id, { status: "inactive" });
    }

    sendResponse(httpStatus.OK, res, null, "Deleted");
  }

  // ----------------- WAS HERE -----------------
  static async toggleWasHere(req, res) {
    const { id } = req.params;
    const userId = this.getCurrentUserId(req);

    const post = await Post.findByPk(id);
    if (!post) throw new AppError({ message: "Not found", httpStatus: 404 });

    if (!(await this.canViewPost(post, userId, req))) throw new AppError({ message: "Forbidden", httpStatus: 403 });

    const existing = await PostWasHere.findOne({
      where: { postId: id, userId },
    });

    let userHasMarked = false;

    if (existing) await existing.destroy();
    else {
      await PostWasHere.create({ postId: id, userId });
      userHasMarked = true;
    }

    const count = await PostWasHere.count({ where: { postId: id } });

    post.wasHereCount = count;
    await post.save();

    sendResponse(httpStatus.OK, res, { count, userHasMarked }, "Updated");
  }

  // ----------------- HEATMAP -----------------
  static async getHeatmap(req, res) {
    // accept either structured bounds or flat query params
    const bounds = req.query;
    const bucketSizeParam = Number(req.query.bucketSize);
    const bucketSize = !Number.isNaN(bucketSizeParam) && bucketSizeParam > 0 ? bucketSizeParam : 0.5;

    const data = await this.Service.getHeatmapData({
      bounds,
      bucketSize,
    });

    sendResponse(httpStatus.OK, res, data, "Heatmap fetched");
  }

  // ----------------- NEARBY -----------------
  static async getNearby(req, res) {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusParam = Number(req.query.radius);

    if ([lat, lng].some((v) => Number.isNaN(v))) throw new AppError({ message: "lat/lng required", httpStatus: 400 });

    const radius = !Number.isNaN(radiusParam) && radiusParam > 0 ? radiusParam : 50;
    const { page, limit } = this.parsePagination(req.query);

    const data = await this.Service.getNearbyPosts({
      lat,
      lng,
      radius,
      page,
      limit,
      include: this.fullIncludes,
    });

    if (data && data.result) {
      data.result = this.attachPostCounts(data.result);
    }
    sendResponse(httpStatus.OK, res, data, "Nearby fetched");
  }
}

export default PostController;
