import PostViewService from "#services/postView";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";

class PostViewController extends BaseController {
  static Service = PostViewService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.create(req, res, next);
  }
}

export default PostViewController;
