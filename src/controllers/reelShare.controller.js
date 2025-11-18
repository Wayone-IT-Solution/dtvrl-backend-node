import BaseController from "#controllers/base";
import ReelShareService from "#services/reelShare";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";
import ReelShare from "#models/reelShare";

class ReelShareController extends BaseController {
  static Service = ReelShareService;

  static async create(req, res) {
    const userId = session.get("userId");
    const { reelId } = req.body;

    req.body.sharedBy = userId;

    const existing = await ReelShare.findOne({
      where: { sharedBy: userId, reelId },
      paranoid: false,
    });

    if (existing) {
      await existing.destroy({ force: true });
    } else {
      await ReelShareService.create(req.body);
    }

    const shareCount = await ReelShare.count({ where: { reelId } });

    return sendResponse(httpStatus.OK, res, {
      reelId,
      shared: !existing,
      totalShares: shareCount,
    });
  }
}

export default ReelShareController;
