import LocationReviewService from "#services/locationReview";
import BaseController from "#controllers/base";

class LocationReviewController extends BaseController {
  static Service = LocationReviewService;
}

export default LocationReviewController;
