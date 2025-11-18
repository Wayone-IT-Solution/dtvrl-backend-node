import BaseController from "#controllers/base";
import ReelCommentService from "#services/reelComment";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";

class ReelCommentController extends BaseController {
  static Service = ReelCommentService;

  static async create(req, res) {
    const userId = session.get("userId");
    const { reelId, comment } = req.body;

    if (!reelId) return sendResponse(httpStatus.BAD_REQUEST, res, null, "reelId is required");
    if (!comment) return sendResponse(httpStatus.BAD_REQUEST, res, null, "comment is required");

    req.body.userId = userId;

    const created = await ReelCommentService.create(req.body);

    return sendResponse(httpStatus.CREATED, res, created);
  }

  static async deleteDoc(req, res) {
    const { id } = req.params;

    await ReelCommentService.deleteDoc(id);

    return sendResponse(httpStatus.OK, res, null, "Comment deleted");
  }
}

export default ReelCommentController;
