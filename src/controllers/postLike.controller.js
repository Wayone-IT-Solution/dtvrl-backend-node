// src/controllers/postLike.js
import BaseController from "#controllers/base";
import PostLikeService from "#services/postLike";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";
import PostLike from "#models/postLike";

class PostLikeController extends BaseController {
  static Service = PostLikeService;

static async create(req, res) {
  try {
    const userId = session.get("userId");
    const { postId } = req.body;

    if (!postId) {
      return sendResponse(httpStatus.BAD_REQUEST, res, null, "postId is required");
    }

    req.body.userId = userId;

    // Check if already liked (include deleted)
    const existing = await PostLike.findOne({
      where: { userId, postId },
      paranoid: false,
    });

    if (existing && existing.deletedAt === null) {
      // Already liked → UNLIKE
      await existing.destroy();           // soft delete
      const likeCount = await PostLike.count({ where: { postId } });

      return sendResponse(httpStatus.OK, res, {
        postId,
        liked: false,
        totalLikes: likeCount,
      });
    }

    if (existing && existing.deletedAt !== null) {
      // Previously unliked → RESTORE
      await existing.restore();
    } else {
      // First time like
      await PostLike.create({ userId, postId });
    }

    const likeCount = await PostLike.count({ where: { postId } });

    return sendResponse(httpStatus.OK, res, {
      postId,
      liked: true,
      totalLikes: likeCount,
    });
  } catch (error) {
    throw error;
  }
}

}

export default PostLikeController;
