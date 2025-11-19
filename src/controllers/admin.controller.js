// src/controllers/admin.controller.js
import { hash } from "bcryptjs";
import httpStatus from "http-status";
import { Sequelize, literal } from "sequelize";
import AppError from "#utils/appError";

import UserService from "#services/user";
import PostService from "#services/post";
import PostController from "#controllers/post";
import StampService from "#services/stamp";
import AdminService from "#services/admin";
import BucketService from "#services/bucket";
import MemoryService from "#services/memory";
import { sendResponse } from "#utils/response";
import BaseController from "#controllers/base";
import LocationService from "#services/location";
import PostLikeService from "#services/postLike";
import ItineraryService from "#services/itinerary";
import ChatGroupService from "#services/chatGroup";
import UserFollowService from "#services/userFollow";
import { session } from "#middlewares/requestSession";
import PostCommentService from "#services/postComment";
import ItineraryLikeService from "#services/itineraryLike";
import LocationReviewService from "#services/locationReview";
import ItineraryCommentService from "#services/itineraryComment";
import ItineraryShareListService from "#services/itineraryShareList";
import AiChatMessageService from "#services/aiChatMessage";
import AiChatSession from "#models/aiChatSession";
import UserFollow from "#models/userFollow";

import Reel from "#models/reel"; // ⭐ REQUIRED FOR updateReelStatus
import ReelController from "#controllers/reel";
import ReelComment from "#models/reelComment";
import ReelLike from "#models/reelLike";
import ReelShare from "#models/reelShare";
import ReelView from "#models/reelView";
import ReelWasHere from "#models/reelWasHere";

class AdminController extends BaseController {
  static Service = AdminService;

  // ----------------- helpers -----------------
  static isAdmin(req) {
    const fromReq = !!(req.user?.isAdmin ?? false);
    const fromSession =
      session.get("isAdmin") ??
      session.get("payload")?.isAdmin ??
      false;

    return fromReq || fromSession;
  }

  static verifyAdmin(req, res, next) {
    if (!this.isAdmin(req)) {
      throw new AppError({
        message: "Admin access only",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }
    next();
  }

  // ----------------- AUTH -----------------
  static async login(req, res) {
    const tokenData = await this.Service.login(req.body);
    sendResponse(httpStatus.OK, res, tokenData, "Logged in successfully");
  }

  static async changePass(req, res) {
    const currentUserId =
      req.user?.userId ??
      session.get("userId") ??
      session.get("payload")?.userId;

    if (!this.isAdmin(req)) {
      throw new AppError({
        httpStatus: httpStatus.FORBIDDEN,
        message: "Only admins are allowed",
      });
    }

    const { password } = req.body;

    const admin = await this.Service.getDocById(currentUserId);
    admin.password = await hash(password, 10);
    await admin.save();

    sendResponse(httpStatus.OK, res, null, "Password changed successfully");
  }

  static async getCurrentUser(req, res) {
    const adminId =
      req.user?.userId ??
      session.get("userId") ??
      session.get("payload")?.userId;

    const loggedInUser = await this.Service.getDocById(adminId);
    sendResponse(httpStatus.OK, res, loggedInUser);
  }

  // ----------------- FOLLOWERS -----------------
  static async getFollowers(req, res) {
    const { userId } = req.query;

    const customOptions = {
      include: [
        {
          model: UserService.Model,
          as: userId ? "otherUser" : "user",
          attributes: ["id", "name", "profile", "username", "email"],
        },
      ],
      attributes: ["id", "createdAt", "userId", "otherId"],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await UserFollowService.get(null, req.query, options);

    sendResponse(httpStatus.OK, res, data);
  }

  // ----------------- CHATGROUPS -----------------
  static async getChatgroups(req, res) {
    const { id } = req.params;

    const customOptions = {
      include: [
        {
          model: UserService.Model,
          as: "Admin",
          attributes: ["id", "name", "profile", "username", "email"],
        },
      ],
    };

    const options = ChatGroupService.getOptions(req.query, customOptions);
    const data = await ChatGroupService.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, data);
  }

  // ----------------- AI CHAT MESSAGES -----------------
  static async getAiChatMessages(req, res) {
    const { id } = req.params;

    const customOptions = {
      include: [
        {
          model: AiChatSession,
          attributes: ["id", "title", "userId", "createdAt", "lastInteractionAt"],
          include: [
            {
              model: UserService.Model,
              attributes: ["id", "name", "username", "email", "profile"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    };

    const options = AiChatMessageService.getOptions(req.query, customOptions);
    const data = await AiChatMessageService.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, data, "AI chat messages fetched");
  }

  // ----------------- USERS -----------------
  static async getUsers(req, res) {
    const { id } = req.params;

    // If getting a specific user by ID, fetch with followers/following
    if (id) {
      const user = await UserService.Model.findByPk(id, {
        attributes: {
          include: [
            [
              literal(`(
              SELECT COUNT(*)
              FROM "${UserFollow.tableName}" AS "followers"
              WHERE "followers"."otherId" = "User"."id"
            )`),
              "followersCount",
            ],
            [
              literal(`(
              SELECT COUNT(*)
              FROM "${UserFollow.tableName}" AS "followings"
              WHERE "followings"."userId" = "User"."id"
            )`),
              "followingCount",
            ],
          ],
        },
        include: [
          {
            model: UserFollow,
            as: "userFollowings",
            attributes: ["id", "userId", "otherId"],
            include: [
              {
                model: UserService.Model,
                as: "otherUser",
                attributes: ["id", "name", "username", "profile", "email"],
              },
            ],
            required: false,
          },
          {
            model: UserFollow,
            as: "userFollowers",
            attributes: ["id", "userId", "otherId"],
            include: [
              {
                model: UserService.Model,
                as: "user",
                attributes: ["id", "name", "username", "profile", "email"],
              },
            ],
            required: false,
          },
        ],
      });

      if (!user) {
        throw new AppError({
          status: false,
          message: "User not found",
          httpStatus: httpStatus.FORBIDDEN,
        });
      }

      const userData = user.toJSON();
      delete userData.password;
      return sendResponse(httpStatus.OK, res, userData);
    }

    // Get all users with pagination and follower/following counts
    const customOptions = {
      attributes: {
        include: [
          [
            literal(`(
            SELECT COUNT(*)
            FROM "${UserFollow.tableName}" AS "followers"
            WHERE "followers"."otherId" = "User"."id"
          )`),
            "followersCount",
          ],
          [
            literal(`(
            SELECT COUNT(*)
            FROM "${UserFollow.tableName}" AS "followings"
            WHERE "followings"."userId" = "User"."id"
          )`),
            "followingCount",
          ],
        ],
      },
      include: [
        {
          model: UserFollow,
          as: "userFollowings",
          attributes: ["id", "userId", "otherId"],
          include: [
            {
              model: UserService.Model,
              as: "otherUser",
              attributes: ["id", "name", "username", "profile", "email"],
            },
          ],
          required: false,
        },
        {
          model: UserFollow,
          as: "userFollowers",
          attributes: ["id", "userId", "otherId"],
          include: [
            {
              model: UserService.Model,
              as: "user",
              attributes: ["id", "name", "username", "profile", "email"],
            },
          ],
          required: false,
        },
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const users = await UserService.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, users);
  }

  static async createUsers(req, res) {
    const user = await UserService.create(req.body);
    sendResponse(httpStatus.CREATED, res, user, "User created successfully");
  }

  static async updateUsers(req, res) {
    const { id } = req.params;

    const user = await UserService.update(id, req.body);
    sendResponse(httpStatus.OK, res, user, "User updated successfully");
  }

  static async deleteUsers(req, res) {
    const { id } = req.params;
    await UserService.deleteDoc(id);

    sendResponse(httpStatus.OK, res, null, "User deleted successfully");
  }

  // ----------------- MEMORIES -----------------
  static async getMemories(req, res) {
    const { id } = req.params;

    const customOptions = {
      include: [
        { model: UserService.Model, attributes: ["id", "name", "profile", "username", "email"] }
      ],
      attributes: ["id", "name", "startDate", "endDate", "latitude", "longitude"],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await MemoryService.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, data);
  }

  static async deleteMemory(req, res) {
    const { id } = req.params;

    await MemoryService.deleteDoc(id);
    sendResponse(httpStatus.OK, res, null, "Memory deleted");
  }

  // ----------------- STAMPS -----------------
  static async getStamps(req, res) {
    const { id } = req.params;

    const customOptions = {
      include: [
        { model: MemoryService.Model, attributes: ["id", "name", "startDate", "endDate"] },
        { model: UserService.Model, attributes: ["id", "name", "profile", "username", "email"] },
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await StampService.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, data);
  }

  // ----------------- POSTS -----------------
  static async getPosts(req, res) {
    const { id } = req.params;
    // Use PostService full includes so arrays (comments, likes, shares, views, wasHere) are returned
    const customOptions = {
      include: PostController.fullIncludes,
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const posts = await PostService.get(id, req.query, options);

    // If single post requested, attach counts and return the object
    if (id) {
      const post = posts;
      const postWithCounts = PostController.attachPostCounts(post);
      return sendResponse(httpStatus.OK, res, postWithCounts);
    }

    // Paginated list — attach counts to each item
    if (posts && posts.result && Array.isArray(posts.result)) {
      posts.result = PostController.attachPostCounts(posts.result);
    }

    sendResponse(httpStatus.OK, res, posts);
  }

  static async createPost(req, res) {
    const data = await PostService.create(req.body);
    sendResponse(httpStatus.CREATED, res, data);
  }

static async updatePost(req, res) {
  const { id } = req.params;
  const { status } = req.query;
  const { caption } = req.body;

  console.log("Post ID:", id);
  console.log("Status:", status);
  console.log("Caption:", caption);

  try {
    // Import Post model
    const Post = (await import("#models/post")).default;

    // Find post by ID
    const post = await Post.findByPk(id);

    if (!post) {
      return sendResponse(httpStatus.NOT_FOUND, res, {
        error: "Post not found",
      });
    }

    // Allowed status list
    const allowedStatuses = ["active", "suspended", "inactive"];
    if (status && !allowedStatuses.includes(status)) {
      return sendResponse(httpStatus.BAD_REQUEST, res, {
        error: "Invalid status. Must be: active, suspended, or inactive",
      });
    }

    // Update fields
    if (status) post.status = status;
    if (caption) post.caption = caption;

    // Save fields safely
    await post.save({
      fields: ["status", "caption"],
    });

    console.log(
      "Successfully updated post:",
      post.id,
      "status:",
      post.status,
      "caption:",
      post.caption
    );

    sendResponse(httpStatus.OK, res, {
      message: "Post updated successfully",
      data: post,
    });

  } catch (error) {
    console.error("Update post error:", error);
    sendResponse(httpStatus.BAD_REQUEST, res, {
      error: error.message,
    });
  }
}

  static async deletePost(req, res) {
    const { id } = req.params;
    await PostService.deleteDoc(id);

    sendResponse(httpStatus.OK, res, null, "Post deleted");
  }

  // ----------------- ITINERARIES -----------------
  static async getItinerary(req, res) {
    const { id } = req.params;

    const customOptions = {
      include: [
        { model: UserService.Model, attributes: ["id", "name", "profile", "username", "email"] }
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await ItineraryService.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, data);
  }

  static async createItinerary(req, res) {
    const data = await ItineraryService.create(req.body);
    sendResponse(httpStatus.CREATED, res, data);
  }

  static async updateItinerary(req, res) {
    const { id } = req.params;
    const data = await ItineraryService.update(id, req.body);

    sendResponse(httpStatus.OK, res, data);
  }

  static async deleteItinerary(req, res) {
    const { id } = req.params;

    await ItineraryService.deleteDoc(id);
    sendResponse(httpStatus.OK, res, null);
  }

  // ----------------- BUCKETS -----------------
  static async getBuckets(req, res) {
    const { id } = req.params;

    const customOptions = {
      include: [
        { model: UserService.Model, attributes: ["id", "name", "profile", "username", "email"] }
      ],
    };

    const options = BucketService.getOptions(req.query, customOptions);
    const data = await BucketService.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, data);
  }

  static async createBuckets(req, res) {
    const bucket = await BucketService.create(req.body);
    sendResponse(httpStatus.CREATED, res, bucket);
  }

  static async updateBuckets(req, res) {
    const { id } = req.params;
    const data = await BucketService.update(id, req.body);

    sendResponse(httpStatus.OK, res, data);
  }

  static async deleteBuckets(req, res) {
    const { id } = req.params;

    await BucketService.deleteDoc(id);
    sendResponse(httpStatus.OK, res, null);
  }

  // ----------------- LOCATIONS -----------------
  static async getLocations(req, res) {
    const { id } = req.params;

    const options = this.Service.getOptions(req.query, {});
    const data = await LocationService.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, data);
  }

  static async deleteLocations(req, res) {
    const { id } = req.params;

    await LocationService.deleteDoc(id);
    sendResponse(httpStatus.OK, res, null);
  }

  // ----------------- ITINERARIES LIST -----------------
  static async getItineraries(req, res) {
    const { id } = req.params;

    const customOptions = {
      include: [
        { model: UserService.Model, attributes: ["id", "name", "username", "profile", "email"] }
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await ItineraryService.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, data);
  }

  // ----------------- LOCATION REVIEWS -----------------
  static async getLocationReviews(req, res) {
    const { id } = req.params;

    const customOptions = {
      include: [
        { model: UserService.Model, attributes: ["id", "name", "profile", "username", "email"] },
        { model: LocationService.Model, attributes: ["id", "name"] },
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await LocationReviewService.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, data);
  }

  static async updateLocationReviews(req, res) {
    const { id } = req.params;

    const data = await LocationReviewService.update(id, req.body);
    sendResponse(httpStatus.OK, res, data);
  }

  static async deleteLocationReviews(req, res) {
    const { id } = req.params;

    await LocationReviewService.deleteDoc(id);
    sendResponse(httpStatus.OK, res, null);
  }

  // -------------------------------------------------------------------
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  //        ⭐ ADMIN — UPDATE POST STATUS ⭐
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  // -------------------------------------------------------------------
  static async updatePostStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["active", "inactive", "suspended"];

    if (!allowed.includes(status)) {
      throw new AppError({
        message: "Invalid status. Allowed: active, inactive, suspended",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const post = await PostService.Model.findByPk(id);
    if (!post) {
      throw new AppError({
        message: "Post not found",
        httpStatus: httpStatus.NOT_FOUND,
      });
    }

    post.status = status;
    await post.save();

    sendResponse(
      httpStatus.OK,
      res,
      post,
      `Post status updated to ${status}`
    );
  }

  // -------------------------------------------------------------------
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  //        ⭐ ADMIN — REEL CRUD ⭐
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  // -------------------------------------------------------------------
  static async getReels(req, res) {
    const { id } = req.params;
    const ReelService = (await import("#services/reel")).default;

    if (id) {
      // Fetch the reel with full associations so admin gets nested data
      const reel = await Reel.findByPk(id, { include: ReelController.fullInclude });
      if (!reel) {
        throw new AppError({
          message: "Reel not found",
          httpStatus: httpStatus.NOT_FOUND,
        });
      }

      // Debug: print the keys present on the fetched object
      try {
        const plain = reel.toJSON ? reel.toJSON() : reel;
        console.log("[ADMIN] Fetched reel keys:", Object.keys(plain));
      } catch (e) {
        console.log("[ADMIN] Could not stringify reel for debug", e);
      }

      // If associations weren't eagerly loaded, load them explicitly as a fallback
      const reelPlain = reel.toJSON ? reel.toJSON() : { ...reel };

      if (!Array.isArray(reelPlain.comments)) {
        const comments = await ReelComment.findAll({
          where: { reelId: id },
          include: [
            {
              model: UserService.Model,
              as: "commentUser",
              attributes: ["id", "username", "profile"],
            },
          ],
          order: [["createdAt", "DESC"]],
        });
        reelPlain.comments = comments.map((c) => (c.toJSON ? c.toJSON() : c));
      }

      if (!Array.isArray(reelPlain.likes)) {
        const likes = await ReelLike.findAll({ where: { reelId: id }, order: [["createdAt", "DESC"]] });
        reelPlain.likes = likes.map((l) => (l.toJSON ? l.toJSON() : l));
      }

      if (!Array.isArray(reelPlain.shares)) {
        const shares = await ReelShare.findAll({ where: { reelId: id }, order: [["createdAt", "DESC"]] });
        reelPlain.shares = shares.map((s) => (s.toJSON ? s.toJSON() : s));
      }

      if (!Array.isArray(reelPlain.views)) {
        const views = await ReelView.findAll({ where: { reelId: id }, order: [["createdAt", "DESC"]] });
        reelPlain.views = views.map((v) => (v.toJSON ? v.toJSON() : v));
      }

      if (!Array.isArray(reelPlain.wasHere)) {
        const wasHere = await ReelWasHere.findAll({ where: { reelId: id }, order: [["createdAt", "DESC"]] });
        reelPlain.wasHere = wasHere.map((w) => (w.toJSON ? w.toJSON() : w));
      }

      // Ensure user is present
      if (!reelPlain.user) {
        const user = await UserService.Model.findByPk(reelPlain.userId, {
          attributes: ["id", "name", "username", "profile", "isPrivate"],
        });
        reelPlain.user = user ? (user.toJSON ? user.toJSON() : user) : null;
      }

      const reelWithCounts = ReelController.attachReelCounts(reelPlain);
      return sendResponse(httpStatus.OK, res, reelWithCounts);
    }

    // List reels with full includes
    const customOptions = { include: ReelController.fullInclude };
    const options = this.Service.getOptions(req.query, customOptions);
    const reels = await ReelService.get(id, req.query, options);
    if (reels && reels.result && Array.isArray(reels.result)) {
      reels.result = ReelController.attachReelCounts(reels.result);
    }
    sendResponse(httpStatus.OK, res, reels);
  }

  static async createReel(req, res) {
    const ReelService = (await import("#services/reel")).default;
    const data = await ReelService.create(req.body);
    sendResponse(httpStatus.CREATED, res, data);
  }

static async updateReel(req, res) {
  const { id } = req.params;
  const { status } = req.query;
  const {caption } = req.body;

  console.log('ID:', id);
  console.log('Query params:', req.query);
  console.log('Status:', status);
  console.log('body', req.body);

  try {
    // Import the Reel model directly
    const Reel = (await import("#models/reel")).default;
    
    // Find the reel by ID
    const reel = await Reel.findByPk(id);
    
    if (!reel) {
      return sendResponse(httpStatus.NOT_FOUND, res, { 
        error: "Reel not found" 
      });
    }

    // Validate the status value
    const allowedStatuses = ["active", "suspended", "inactive"];
    if (!allowedStatuses.includes(status)) {
      return sendResponse(httpStatus.BAD_REQUEST, res, { 
        error: "Invalid status. Must be: active, suspended, or inactive" 
      });
    }

    // Update ONLY the status field - this avoids userId validation issues
    reel.status = status;
    reel.caption = caption;
    
    // Save only the status field
    await reel.save({ fields: ['status'] });

    console.log('Successfully updated reel status:', reel.id, 'to', status);
    
    sendResponse(httpStatus.OK, res, {
      message: "Reel status updated successfully",
      data: reel
    });

  } catch (error) {
    console.error('Update reel error:', error);
    sendResponse(httpStatus.BAD_REQUEST, res, { 
      error: error.message 
    });
  }
}

  static async deleteReel(req, res) {
    const { id } = req.params;
    const ReelService = (await import("#services/reel")).default;
    await ReelService.deleteDoc(id);

    sendResponse(httpStatus.OK, res, null, "Reel deleted");
  }

  // -------------------------------------------------------------------
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  //        ⭐ ADMIN — UPDATE USER STATUS ⭐
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  // -------------------------------------------------------------------
  static async updateUserStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["active", "inactive", "suspended"];

    if (!allowed.includes(status)) {
      throw new AppError({
        message: "Invalid status. Allowed: active, inactive, suspended",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const user = await UserService.Model.findByPk(id);
    if (!user) {
      throw new AppError({
        message: "User not found",
        httpStatus: httpStatus.NOT_FOUND,
      });
    }

    user.status = status;
    await user.save();

    sendResponse(
      httpStatus.OK,
      res,
      user,
      `User status updated to ${status}`
    );
  }

  // -------------------------------------------------------------------
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  //        ⭐ ADMIN — UPDATE REEL STATUS ⭐
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  // -------------------------------------------------------------------
  static async updateReelStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["active", "inactive", "suspended"];

    if (!allowed.includes(status)) {
      throw new AppError({
        message: "Invalid status. Allowed: active, inactive, suspended",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const reel = await Reel.findByPk(id);
    if (!reel) {
      throw new AppError({
        message: "Reel not found",
        httpStatus: httpStatus.NOT_FOUND,
      });
    }

    reel.status = status;
    await reel.save();

    sendResponse(
      httpStatus.OK,
      res,
      reel,
      `Reel status updated to ${status}`
    );
  }
}

export default AdminController;
