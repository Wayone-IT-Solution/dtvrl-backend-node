import LocationReviewService from "#services/locationReview";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import User from "#models/user";
import LocationReviewComment from "#models/locationReviewComment";
import LocationReviewLike from "#models/locationReviewLike";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";
import { fn, col, Sequelize } from "sequelize";

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
      subQuery: false,
      attributes: {
        include: [
          [
            Sequelize.fn("COUNT", Sequelize.col("LocationReviewLikes.id")),
            "likeCount",
          ],
          [
            Sequelize.fn("COUNT", Sequelize.col("LocationReviewComments.id")),
            "commentCount",
          ],
        ],
      },
      include: [
        {
          model: LocationReviewLike,
          attributes: [],
          required: false,
          where: { deletedAt: null },
        },
        {
          model: LocationReviewComment,
          attributes: [],
          required: false,
          where: { deletedAt: null },
        },
        {
          model: User,
          attributes: ["id", "name", "profile"],
          required: false,
          where: { deletedAt: null },
        },
      ],
      group: ["LocationReview.id", "User.id"],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await this.Service.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, data);
  }
}

export default LocationReviewController;
