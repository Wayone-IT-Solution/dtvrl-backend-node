import ItineraryService from "#services/itinerary";
import BaseController from "#controllers/base";

class ItineraryController extends BaseController {
  static Service = ItineraryService;
}

export default ItineraryController;
