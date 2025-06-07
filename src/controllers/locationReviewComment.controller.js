import LocationReviewCommentService from "#services/locationReviewComment";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";

class LocationReviewCommentController extends BaseController {
  static Service = LocationReviewCommentService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.create(req, res, next);
  }
}

export default LocationReviewCommentController;
