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

      // check existing like (including soft-deleted records)
      const existing = await PostLike.findOne({
        where: { userId, postId },
        paranoid: false,  // ✅ Include soft-deleted records
      });

      if (existing) {
        // Force permanent delete to avoid unique constraint violation
        await existing.destroy({ force: true });  // ✅ Permanent delete
      } else {
        await PostLikeService.create(req.body);
      }

      const likeCount = await PostLike.count({ where: { postId } });

      return sendResponse(httpStatus.OK, res, {
        postId,
        liked: !existing,
        totalLikes: likeCount,
      });
    } catch (error) {
      throw error;
    }
  }
}

export default PostLikeController;
