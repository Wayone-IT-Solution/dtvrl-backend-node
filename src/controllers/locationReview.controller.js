import LocationReviewService from "#services/locationReview";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import User from "#models/user";
import { sendResponse } from "#utils/response";

class LocationReviewController extends BaseController {
  static Service = LocationReviewService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.create(req, res, next);
  }

  static async get(req, res, next) {
    const { id } = req.params;

    const customOptions = {
      include: [
        {
          model: User,
          attributes: ["id", "name", "profile"],
        },
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await this.Service.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, data);
  }
}

export default LocationReviewController;
