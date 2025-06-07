import LocationReviewLikeService from "#services/locationReviewLike";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";

class LocationReviewLikeController extends BaseController {
  static Service = LocationReviewLikeService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.create(req, res, next);
  }
}

export default LocationReviewLikeController;
