import ItineraryShareListService from "#services/itineraryShareList";
import ItineraryService from "#services/itinerary";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import AppError from "#utils/appError";
import httpStatus from "http-status";

class ItineraryShareListController extends BaseController {
  static Service = ItineraryShareListService;

  static async create(req, res, next) {
    const userId = session.get("userId");

    const { itineraryId } = req.body;
    const itinerary = await ItineraryService.getDoc({ id: itineraryId });

    if (itinerary.userId !== userId) {
      throw new AppError({
        status: false,
        message: "You don't have access to this itinerary",
        httpStatus: httpStatus.OK,
      });
    }

    return await super.create(req, res, next);
  }
}

export default ItineraryShareListController;
