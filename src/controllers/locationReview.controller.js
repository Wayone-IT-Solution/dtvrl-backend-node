import User from "#models/user";
import httpStatus from "http-status";
import Location from "#models/location";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import { fn, col, Sequelize } from "sequelize";
import { session } from "#middlewares/requestSession";
import LocationReviewLike from "#models/locationReviewLike";
import LocationReviewService from "#services/locationReview";
import LocationReviewComment from "#models/locationReviewComment";

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
            Sequelize.fn(
              "COUNT",
              Sequelize.fn("DISTINCT", Sequelize.col("LocationReviewLikes.id")),
            ),
            "likeCount",
          ],
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.fn(
                "DISTINCT",
                Sequelize.col("LocationReviewComments.id"),
              ),
            ),
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
        {
          model: Location,
          attributes: ["id", "name"],
          required: true,
          where: { deletedAt: null },
        },
      ],
      group: ["LocationReview.id", "User.id", "Location.id"],
    };

    const options = this.Service.getOptions(req.query, customOptions);

    let data;

    if (id) {
      data = await this.Service.Model.findDoc({ id }, options);
    } else {
      data = await this.Service.get(id, req.query, options);
    }

    sendResponse(httpStatus.OK, res, data);
  }

  static async update(req, res, next) {
    const userId = session.get("userId");
    const { id } = req.params;
    const doc = await this.Service.getDoc({ userId, id });

    doc.updateFields(req.body);
    await doc.save();
    sendResponse(httpStatus.OK, res, doc);
  }
}

export default LocationReviewController;
