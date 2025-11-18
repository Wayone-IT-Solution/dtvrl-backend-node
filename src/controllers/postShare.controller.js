import PostShareService from "#services/postShare";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";
import PostShare from "#models/postShare";

class PostShareController extends BaseController {
  static Service = PostShareService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    const { postId } = req.body;

    req.body.sharedBy = userId;

    // check existing share - toggle behavior
    const existing = await PostShare.findOne({
      where: { sharedBy: userId, postId },
      paranoid: false,  // ✅ Include soft-deleted records
    });

    if (existing) {
      await existing.destroy({ force: true });  // ✅ Permanent delete
    } else {
      await PostShareService.create(req.body);
    }

    const shareCount = await PostShare.count({ where: { postId } });

    return sendResponse(httpStatus.OK, res, {
      postId,
      shared: !existing,
      totalShares: shareCount,
    });
  }
}

export default PostShareController;
