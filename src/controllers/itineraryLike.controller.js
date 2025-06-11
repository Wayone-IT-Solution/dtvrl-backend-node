import ItineraryLikeService from "#services/itineraryLike";
import BaseController from "#controllers/base";
import ItineraryService from "#services/itinerary";
import AppError from "#utils/appError";
import httpStatus from "http-status";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";

class ItineraryLikeController extends BaseController {
  static Service = ItineraryLikeService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;

    const itinerary = await ItineraryService.getDocById(req.body.itineraryId);

    if (!itinerary.public) {
      throw new AppError({
        status: false,
        message: "Cannot like a private itinerary",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    const existing = await this.Service.getDoc(
      {
        userId,
        itineraryId: req.body.itineraryId,
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

export default ItineraryLikeController;
