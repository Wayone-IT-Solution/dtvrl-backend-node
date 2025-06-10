import httpStatus from "http-status";
import AdminService from "#services/admin";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import { session } from "#middlewares/requestSession";
import UserService from "#services/user";
import PostService from "#services/post";
import PostLikeService from "#services/postLike";
import PostCommentService from "#services/postComment";
import { Sequelize } from "sequelize";

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

  static async getUsers(req, res, next) {
    const { id } = req.params;
    const options = this.Service.getOptions(req.query, {});
    const users = await UserService.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, users, "Users fetched successfully");
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
}

export default AdminController;
