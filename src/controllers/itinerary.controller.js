import ItineraryService from "#services/itinerary";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";

class ItineraryController extends BaseController {
  static Service = ItineraryService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.create(req, res, next);
  }
}

export default ItineraryController;
