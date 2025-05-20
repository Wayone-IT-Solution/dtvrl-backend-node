import ItineraryCommentService from "#services/itineraryComment";
import BaseController from "#controllers/base";

class ItineraryCommentController extends BaseController {
  static Service = ItineraryCommentService;
}

export default ItineraryCommentController;
