import LocationReviewLikeService from "#services/locationReviewLike";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";

class LocationReviewLikeController extends BaseController {
  static Service = LocationReviewLikeService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;

    const existing = await this.Service.getDoc(
      {
        userId,
        locationReviewId: req.body.locationReviewId,
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

export default LocationReviewLikeController;
