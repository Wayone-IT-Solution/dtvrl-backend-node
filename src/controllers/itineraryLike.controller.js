import ItineraryLikeService from "#services/itineraryLike";
import BaseController from "#controllers/base";

class ItineraryLikeController extends BaseController {
  static Service = ItineraryLikeService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;

    const existing = await this.Service.getDoc(
      {
        userId,
        itineraryId: req.body.itineraryId,
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

export default ItineraryLikeController;
