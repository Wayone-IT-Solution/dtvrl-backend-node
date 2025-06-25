import httpStatus from "http-status";
import { Sequelize } from "sequelize";
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
import { session } from "#middlewares/requestSession";
import PostCommentService from "#services/postComment";
import LocationReviewService from "#services/locationReview";
import ChatGroupMemberService from "#services/chatGroupMember";

class AdminController extends BaseController {
  static Service = AdminService;

  static async login(req, res, next) {
    const tokenData = await this.Service.login(req.body);
    sendResponse(httpStatus.OK, res, tokenData, "Logged in successfully");
  }

  static async getCurrentUser(req, res, next) {
    const adminId = session.get("userId");
    const loggedInUser = await this.Service.getDocById(adminId);
    sendResponse(httpStatus.OK, res, loggedInUser);
  }

  static async getChatgroups(req, res, next) {
    const { id } = req.params;
    const customOptions = {
      include: [
        {
          model: UserService.Model,
          as: "Admin",
          attributes: ["id", "name", "profile"],
        },
      ],
    };
    // TODO: Add member count in this API
    const options = ChatGroupService.getOptions(req.query, customOptions);
    const data = await ChatGroupService.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
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
          attributes: ["id", "name", "profile"],
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
          attributes: ["id", "name", "profile"],
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

  // static async getItinerary(req, res, next) {
  //   const { id } = req.params;
  //   const customOptions = {
  //     include: [
  //       {
  //         model: UserService.Model,
  //         attributes: ["id", "name", "profile"],
  //       },
  //     ],
  //   };
  //
  //   const options = this.Service.getOptions(req.query, customOptions);
  //   const data = await ItineraryService.get(id, req.query, options);
  //   sendResponse(httpStatus.OK, res, data);
  // }

  // static async createItinerary(req, res, next) {
  //   const data = await ItineraryService.create(req.body);
  //   sendResponse(httpStatus.CREATED, res, data);
  // }
  //
  // static async updateItinerary(req, res, next) {
  //   const { id } = req.params;
  //   const data = await ItineraryService.update(id, req.body);
  //   sendResponse(httpStatus.OK, res, data);
  // }
  //
  // static async deleteItinerary(req, res, next) {
  //   const { id } = req.params;
  //   const data = await ItineraryService.deleteDoc(id);
  //   sendResponse(httpStatus.OK, res, null);
  // }

  static async getBuckets(req, res, next) {
    const { id } = req.params;
    const customOptions = {
      include: [
        {
          model: UserService.Model,
          attributes: ["id", "name", "profile"],
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
          attributes: ["id", "name", "profile"],
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
          attributes: ["id", "name", "profile"],
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
}

export default AdminController;
