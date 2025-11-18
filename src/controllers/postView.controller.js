import PostViewService from "#services/postView";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";
import PostView from "#models/postView";

class PostViewController extends BaseController {
  static Service = PostViewService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    const { postId } = req.body;

    req.body.userId = userId;

    // check existing view - toggle behavior
    const existing = await PostView.findOne({
      where: { userId, postId },
      paranoid: false,  // ✅ Include soft-deleted records
    });

    if (existing) {
      await existing.destroy({ force: true });  // ✅ Permanent delete
    } else {
      await PostViewService.create(req.body);
    }

    const viewCount = await PostView.count({ where: { postId } });

    return sendResponse(httpStatus.OK, res, {
      postId,
      viewed: !existing,
      totalViews: viewCount,
    });
  }
}

export default PostViewController;
