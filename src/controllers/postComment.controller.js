import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import PostCommentService from "#services/postComment";

class PostCommentController extends BaseController {
  static Service = PostCommentService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.create(req, res, next);
  }
}

export default PostCommentController;
