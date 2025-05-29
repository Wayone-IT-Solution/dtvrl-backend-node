import httpStatus from "http-status";
import PostService from "#services/post";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import { session } from "#middlewares/requestSession";

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
      "userData.profile AS profile",
      "userData.username AS username",
    ];

    const options = { lookups, fields };

    const posts = await this.Service.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, posts, "Posts fetched successfully");
  }

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    const data = await this.Service.create(req.body);
    sendResponse(httpStatus.OK, res, data, "Post created successfully");
  }
}

export default PostController;
