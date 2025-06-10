import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import PostCommentService from "#services/postComment";
import httpStatus from "http-status";

class PostCommentController extends BaseController {
  static Service = PostCommentService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.create(req, res, next);
  }

  static async get(req, res, next) {
    const customOptions = {
      include: [
        {
          model: User,
          attributes: ["id", "name", "username", "profile", "email"],
        },
      ],
    };

    const { id } = req.params;

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await this.Service(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }
}

export default PostCommentController;
