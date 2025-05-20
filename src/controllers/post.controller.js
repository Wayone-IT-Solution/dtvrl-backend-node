import httpStatus from "http-status";
import PostService from "#services/post";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";

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
    ];

    const fields = ["image", "caption"];

    const options = { lookups, fields };

    const posts = await this.Service.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, posts, "Posts fetched successfully");
  }
}

export default PostController;
