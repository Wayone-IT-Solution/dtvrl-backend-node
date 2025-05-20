import ItineraryRecommendService from "#services/itineraryRecommend";
import BaseController from "#controllers/base";

class ItineraryRecommendController extends BaseController {
  static Service = ItineraryRecommendService;
}

export default ItineraryRecommendController;
