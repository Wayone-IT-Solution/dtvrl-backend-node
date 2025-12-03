import BaseController from "#controllers/base";
import ReelLikeService from "#services/reelLike";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";
import ReelLike from "#models/reelLike";

class ReelLikeController extends BaseController {
  static Service = ReelLikeService;

static async create(req, res) {
  try {
    const userId = session.get("userId");
    const { reelId } = req.body;

    if (!reelId) {
      return sendResponse(httpStatus.BAD_REQUEST, res, null, "reelId is required");
    }

    req.body.userId = userId;

    const existing = await ReelLike.findOne({
      where: { userId, reelId },
      paranoid: false,
    });

    if (existing && existing.deletedAt === null) {
      // User already liked → unlike
      await existing.destroy(); // soft delete
      const likeCount = await ReelLike.count({ where: { reelId } });

      return sendResponse(httpStatus.OK, res, {
        reelId,
        liked: false,
        totalLikes: likeCount,
      });
    } 
    
    if (existing && existing.deletedAt !== null) {
      // Previously unliked → restore
      await existing.restore();
    } else {
      // New like
      await ReelLike.create({ userId, reelId });
    }

    const likeCount = await ReelLike.count({ where: { reelId } });

    return sendResponse(httpStatus.OK, res, {
      reelId,
      liked: true,
      totalLikes: likeCount,
    });
  } catch (error) {
    throw error;
  }
}

}

export default ReelLikeController;
