import User from "#models/user";
import httpStatus from "http-status";
import PostLike from "#models/postLike";
import PostService from "#services/post";
import PostComment from "#models/postComment";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import { Sequelize } from "sequelize";
import { session } from "#middlewares/requestSession";

class PostController extends BaseController {
  static Service = PostService;

  static async get(req, res, next) {
    const { id } = req.params;

    if (id) {
      return await this.Service.getDocById(id);
    }

    const customOptions = {
      include: [
        {
          model: PostLike,
          attributes: [],
          duplicating: false,
          required: false,
        },
        {
          model: User,
          attributes: ["id", "name", "username", "profile", "email"],
        },
        {
          model: PostComment,
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
    const data = await this.Service.get(null, req.query, options);

    sendResponse(httpStatus.OK, res, data, "Posts fetched successfully");
  }

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    const data = await this.Service.create(req.body);
    sendResponse(httpStatus.OK, res, data, "Post created successfully");
  }
}

export default PostController;
