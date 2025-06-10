import BaseController from "#controllers/base";
import PostLikeService from "#services/postLike";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";

class PostLikeController extends BaseController {
  static Service = PostLikeService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;

    const existing = await this.Service.getDoc(
      {
        userId,
        postId: req.body.postId,
      },
      { allowNull: true },
    );

    if (existing) {
      await existing.destroy({ force: true });
      return sendResponse(httpStatus.OK, res, null);
    }

    return await super.create(req, res, next);
  }
}

export default PostLikeController;
