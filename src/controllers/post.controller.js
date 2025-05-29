import httpStatus from "http-status";
import PostService from "#services/post";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import { session } from "#middlewares/requestSession";
import PostLike from "#models/postLike";
import User from "#models/user";

class PostController extends BaseController {
  static Service = PostService;

  static async get(req, res, next) {
    const { id } = req.params;

    const lookups = [
      {
        from: "PostLikes",
        as: "likeData",
        localField: "id",
        foreignField: "postId",
      },
      {
        from: "Users",
        as: "userData",
        localField: "userId",
        foreignField: "id",
      },
    ];

    const fields = [
      "id",
      "image",
      "userId",
      "caption",
      "createdAt",
      "userData.username AS username",
      "userData.profile AS profileImage",
      // "COUNT(likeData.id) AS likeCount",
    ];

    const options = { lookups, fields };

    const data = await this.Service.Model.findAll({
      where: req.query,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "profile"],
        },
      ],
    });

    const posts = await this.Service.get(id, req.query, options);

    if (!id) {
      const { result } = posts;

      const postIds = result.map((post) => post.id);

      // const likeCount = PostLike.sequelize.query();
    }

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
