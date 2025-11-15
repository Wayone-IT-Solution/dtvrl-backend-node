import { hash } from "bcryptjs";
import httpStatus from "http-status";
import { Sequelize } from "sequelize";
import AppError from "#utils/appError";
import UserService from "#services/user";
import PostService from "#services/post";
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

class AdminController extends BaseController {
  static Service = AdminService;

  static async login(req, res, next) {
    const tokenData = await this.Service.login(req.body);
    sendResponse(httpStatus.OK, res, tokenData, "Logged in successfully");
  }

  static async changePass(req, res, next) {
    const payload = session.get("payload");
    const { isAdmin, userId } = payload;

    if (!isAdmin) {
      throw new AppError({
        httpStatus: httpStatus.FORBIDDEN,
        message: "Only admins are allowed",
      });
    }

    const { password } = req.body;
    const admin = await this.Service.getDocById(userId);
    admin.password = await hash(password, 10);
    await admin.save();

    sendResponse(httpStatus.OK, res, null, "Password changed successfully");
  }

  static async getCurrentUser(req, res, next) {
    const adminId = session.get("userId");
    const loggedInUser = await this.Service.getDocById(adminId);
    sendResponse(httpStatus.OK, res, loggedInUser);
  }

  static async getFollowers(req, res, next) {
    const { userId, otherId } = req.query;
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

    if (userId) delete req.query.otherId;
    if (otherId) delete req.query.userId;

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await UserFollowService.get(null, req.query, options);

    sendResponse(httpStatus.OK, res, data);
  }

  static async getChatgroups(req, res, next) {
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
    // TODO: Add member count in this API
    const options = ChatGroupService.getOptions(req.query, customOptions);
    const data = await ChatGroupService.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }

  static async getAiChatMessages(req, res) {
    const { id } = req.params;
    const customOptions = {
      include: [
        {
          model: AiChatSession,
          attributes: [
            "id",
            "title",
            "userId",
            "createdAt",
            "lastInteractionAt",
          ],
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
    sendResponse(
      httpStatus.OK,
      res,
      data,
      "AI chat messages fetched successfully",
    );
  }

  static async getUsers(req, res, next) {
    const { id } = req.params;
    const options = this.Service.getOptions(req.query, {});
    const users = await UserService.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, users, "Users fetched successfully");
  }

  static async createUsers(req, res, next) {
    const user = await UserService.create(req.body);
    sendResponse(httpStatus.CREATED, res, user);
  }

  static async updateUsers(req, res, next) {
    const { id } = req.params;
    const user = await UserService.update(id, req.body);
    sendResponse(httpStatus.OK, res, user);
  }

  static async deleteUsers(req, res, next) {
    const { id } = req.params;
    const user = await UserService.deleteDoc(id);
    sendResponse(httpStatus.OK, res, user);
  }

  static async getMemories(req, res, next) {
    const { id } = req.params;
    const customOptions = {
      include: [
        {
          model: UserService.Model,
          attributes: ["id", "name", "profile", "username", "email"],
        },
      ],
      attributes: [
        "id",
        "name",
        "startDate",
        "endDate",
        "latitude",
        "longitude",
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await MemoryService.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }

  static async deleteMemory(req, res, next) {
    const { id } = req.params;
    await MemoryService.deleteDoc(id);
    sendResponse(httpStatus.OK, res, null, "Memory deleted successfully");
  }

  static async getStamps(req, res, next) {
    const { id } = req.params;

    const customOptions = {
      include: [
        {
          model: MemoryService.Model,
          attributes: ["id", "name", "startDate", "endDate"],
        },
        {
          model: UserService.Model,
          attributes: ["id", "name", "profile", "username", "email"],
        },
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await StampService.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }

  static async getPosts(req, res, next) {
    const { id } = req.params;

    const customOptions = {
      include: [
        {
          model: PostLikeService.Model,
          attributes: [],
          duplicating: false,
          required: false,
        },
        {
          model: UserService.Model,
          attributes: ["id", "name", "username", "profile", "email"],
        },
        {
          model: PostCommentService.Model,
          attributes: [],
          duplicating: false,
          required: false,
        },
      ],
      attributes: [
        "id",
        "image",
        "caption",
        "createdAt",
        [Sequelize.fn("COUNT", Sequelize.col("PostLikes.id")), "likeCount"],
        [
          Sequelize.fn("COUNT", Sequelize.col("PostComments.id")),
          "commentCount",
        ],
      ],
      group: [
        "Post.id",
        "User.id",
        "Post.image",
        "Post.caption",
        "User.profile",
        "User.username",
        "Post.createdAt",
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const posts = await PostService.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, posts);
  }

  static async createPost(req, res, next) {
    const data = await PostService.create(req.body);
    sendResponse(httpStatus.CREATED, res, data);
  }

  static async updatePost(req, res, next) {
    const { id } = req.params;
    const data = await PostService.update(id, req.body);
    sendResponse(httpStatus.OK, res, data);
  }

  static async deletePost(req, res, next) {
    const { id } = req.params;
    await PostService.deleteDoc(id);
    sendResponse(httpStatus.OK, res, null, "Post deleted successfully");
  }

  static async getItinerary(req, res, next) {
    const { id } = req.params;
    const customOptions = {
      include: [
        {
          model: UserService.Model,
          attributes: ["id", "name", "profile", "username", "email"],
        },
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await ItineraryService.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }

  static async createItinerary(req, res, next) {
    const data = await ItineraryService.create(req.body);
    sendResponse(httpStatus.CREATED, res, data);
  }

  static async updateItinerary(req, res, next) {
    const { id } = req.params;
    const data = await ItineraryService.update(id, req.body);
    sendResponse(httpStatus.OK, res, data);
  }

  static async deleteItinerary(req, res, next) {
    const { id } = req.params;
    await ItineraryService.deleteDoc(id);
    sendResponse(httpStatus.OK, res, null);
  }

  static async getBuckets(req, res, next) {
    const { id } = req.params;
    const customOptions = {
      include: [
        {
          model: UserService.Model,
          attributes: ["id", "name", "profile", "username", "email"],
        },
      ],
    };

    const options = BucketService.getOptions(req.query, customOptions);
    const data = await BucketService.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }

  static async createBuckets(req, res, next) {
    const bucket = await BucketService.create(req.body);
    sendResponse(httpStatus.CREATED, res, bucket);
  }

  static async updateBuckets(req, res, next) {
    const { id } = req.params;
    const data = await BucketService.update(id, req.body);
    sendResponse(httpStatus.OK, res, data);
  }

  static async deleteBuckets(req, res, next) {
    const { id } = req.params;
    await BucketService.deleteDoc(id);
    sendResponse(httpStatus.OK, res, null, "Bucket deleted successfully");
  }

  static async getLocations(req, res, next) {
    const { id } = req.params;
    const options = this.Service.getOptions(req.query, {});

    const data = await LocationService.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }

  static async getItineraries(req, res, next) {
    const { id } = req.params;

    const customOptions = {
      include: [
        {
          model: UserService.Model,
          attributes: ["id", "name", "username", "profile", "email"],
        },
      ],
    };
    const options = this.Service.getOptions(req.query, customOptions);

    const data = await ItineraryService.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }

  static async getLocationReviews(req, res, next) {
    const { id } = req.params;

    const customOptions = {
      include: [
        {
          model: UserService.Model,
          attributes: ["id", "name", "profile", "username", "email"],
        },
        {
          model: LocationService.Model,
          attributes: ["id", "name"],
        },
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);

    const data = await LocationReviewService.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }

  static async updateLocationReviews(req, res, next) {
    const { id } = req.params;
    const data = await LocationReviewService.update(id, req.body);
    sendResponse(httpStatus.OK, res, data);
  }

  static async deleteLocationReviews(req, res, next) {
    const { id } = req.params;
    await LocationReviewService.deleteDoc(id);
    sendResponse(httpStatus.OK, res, null);
  }

  static async deleteLocations(req, res, next) {
    const { id } = req.params;
    await LocationService.deleteDoc(id);
    sendResponse(httpStatus.OK, res, null);
  }
}

export default AdminController;
