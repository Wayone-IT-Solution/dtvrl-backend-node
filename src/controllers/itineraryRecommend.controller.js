import Itinerary from "#models/itinerary";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import ItineraryRecommendService from "#services/itineraryRecommend";
import ItineraryService from "#services/itinerary";
import AppError from "#utils/appError";
import httpStatus from "http-status";
import { sendResponse } from "#utils/response";

class ItineraryRecommendController extends BaseController {
  static Service = ItineraryRecommendService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;

    const itinerary = await ItineraryService.getDocById(req.body.itineraryId);
    if (!itinerary.public) {
      throw new AppError({
        status: false,
        message: "This is not a public itinerary",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const existing = await this.Service.getDoc(
      {
        userId,
        itineraryId: req.body.itineraryId,
      },
      {
        allowNull: true,
      },
    );

    if (existing) {
      await existing.destroy({ force: true });
      return sendResponse(httpStatus.OK, res, null);
    }

    return await super.create(req, res, next);
  }
}

export default ItineraryRecommendController;
