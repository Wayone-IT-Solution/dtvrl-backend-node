import PostViewService from "#services/postView";
import BaseController from "#controllers/base";

class PostViewController extends BaseController {
  static Service = PostViewService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.create(req, res, next);
  }
}

export default PostViewController;
