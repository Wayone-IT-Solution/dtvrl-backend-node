import BaseController from "#controllers/base";
import ReelViewService from "#services/reelView";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";
import ReelView from "#models/reelView";

class ReelViewController extends BaseController {
  static Service = ReelViewService;

  static async create(req, res) {
    const userId = session.get("userId");
    const { reelId } = req.body;

    req.body.userId = userId;

    const existing = await ReelView.findOne({
      where: { userId, reelId },
      paranoid: false,
    });

    if (existing) {
      await existing.destroy({ force: true });
    } else {
      await ReelViewService.create(req.body);
    }

    const viewCount = await ReelView.count({ where: { reelId } });

    return sendResponse(httpStatus.OK, res, {
      reelId,
      viewed: !existing,
      totalViews: viewCount,
    });
  }
}

export default ReelViewController;
