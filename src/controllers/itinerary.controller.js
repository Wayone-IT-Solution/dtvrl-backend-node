import ItineraryService from "#services/itinerary";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import AppError from "#utils/appError";
import ItineraryShareList from "#models/itineraryShareList";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";
import { Op, Sequelize } from "sequelize";
import ItineraryLike from "#models/itineraryLike";
import ItineraryComment from "#models/itineraryComment";
import User from "#models/user";
import ItineraryRecommend from "#models/itineraryRecommend";

class ItineraryController extends BaseController {
  static Service = ItineraryService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.create(req, res, next);
  }

  static async get(req, res, next) {
    const userId = session.get("userId");
    const { id } = req.params;
    req.query.userId = userId;

    const customOptions = {
      include: [
        {
          model: ItineraryLike,
          attributes: [],
          duplicating: false,
          required: false,
        },
        {
          model: User,
          attributes: ["id", "name", "username", "profile", "email"],
        },
        {
          model: ItineraryComment,
          attributes: [],
          duplicating: false,
          required: false,
        },
      ],
      attributes: [
        "id",
        "title",
        "amount",
        "startDate",
        "endDate",
        "public",
        "description",
        "peopleCount",
        "createdAt",
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.fn("DISTINCT", Sequelize.col("ItineraryLikes.id")),
          ),
          "likeCount",
        ],
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.fn("DISTINCT", Sequelize.col("ItineraryComments.id")),
          ),
          "commentCount",
        ],
      ],
      group: ["Itinerary.id", "User.id"],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await this.Service.get(id, req.query, options);

    sendResponse(httpStatus.OK, res, data, "Itineraries fetched successfully");
  }

  static async update(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;

    const { id } = req.params;

    const itinerary = await this.Service.getDoc(
      {
        id,
      },
      {
        include: [
          {
            model: ItineraryShareList,
            attributes: ["id", "userId"],
          },
          {
            model: ItineraryLike,
            attributes: [],
            duplicating: false,
            required: false,
          },
          {
            model: User,
            attributes: ["id", "name", "username", "profile", "email"],
          },
          {
            model: ItineraryComment,
            attributes: [],
            duplicating: false,
            required: false,
          },
        ],
        attributes: [
          "id",
          "title",
          "amount",
          "startDate",
          "endDate",
          "public",
          "description",
          "peopleCount",
          "createdAt",
          [
            Sequelize.fn("COUNT", Sequelize.col("ItineraryLikes.id")),
            "likeCount",
          ],
          [
            Sequelize.fn("COUNT", Sequelize.col("ItineraryComments.id")),
            "commentCount",
          ],
        ],
        group: [
          "Itinerary.id",
          "User.id",
          "User.username",
          "Itinerary.createdAt",
        ],
      },
    );

    if (itinerary.public) {
      throw new AppError({
        status: false,
        message: "Cannot update a public itinerary",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    if (itinerary.userId !== userId) {
      const shared = itinerary.ItineraryShareLists.find(
        (ele) => ele.userId === userId,
      );

      if (!shared) {
        throw new AppError({
          status: false,
          message: "You don't have access to this itinerary",
          httpStatus: httpStatus.FORBIDDEN,
        });
      }
    }

    itinerary.updateFields(req.body);
    await itinerary.save();
    sendResponse(
      httpStatus.OK,
      res,
      itinerary,
      `${this.Service.Model.updatedName()} updated successfully`,
    );
  }

  static async getSharedItinerary(req, res, next) {
    const customOptions = {
      include: [
        {
          model: ItineraryLike,
          attributes: [],
          duplicating: false,
          required: false,
        },
        {
          model: User,
          attributes: ["id", "name", "username", "profile", "email"],
        },
        {
          model: ItineraryComment,
          attributes: [],
          duplicating: false,
          required: false,
        },
        {
          model: ItineraryRecommend,
          attributes: [],
          duplicating: false,
          required: false,
          as: "ItineraryRecommends",
        },
        {
          model: ItineraryRecommend,
          as: "UserRecommendation", // alias
          attributes: ["id"],
          duplicating: false,
          required: false,
          where: {
            userId: session.get("userId"), // current logged in user
          },
        },
      ],
      attributes: [
        "id",
        "title",
        "amount",
        "startDate",
        "endDate",
        "public",
        "description",
        "peopleCount",
        "createdAt",
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.fn("DISTINCT", Sequelize.col("ItineraryLikes.id")),
          ),
          "likeCount",
        ],
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.fn("DISTINCT", Sequelize.col("ItineraryComments.id")),
          ),
          "commentCount",
        ],
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.fn("DISTINCT", Sequelize.col("ItineraryRecommends.id")),
          ),
          "recommendedCount",
        ],
        [
          Sequelize.literal(
            `CASE WHEN "UserRecommendation"."id" IS NOT NULL THEN true ELSE false END`,
          ),
          "isRecommended",
        ],
      ],
      group: ["Itinerary.id", "User.id", "UserRecommendation.id"],
    };

    const options = this.Service.getOptions({ public: true }, customOptions);
    const data = await this.Service.get(null, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }

  static async shareWithAll(req, res, next) {
    const { itineraryId: id } = req.body;
    const [itinerary] = await Promise.all([
      this.Service.getDocById(id, { raw: true }),
    ]);

    if (itinerary.public) {
      throw new AppError({
        status: false,
        message: "Itinerary is already public",
        httpStatus: httpStatus.CONFLICT,
      });
    }

    const excludedOptions = ["id", "createdAt", "updatedAt", "deletedAt"];

    const newData = {};

    for (const key in itinerary) {
      if (excludedOptions.includes(key)) continue;
      newData[key] = itinerary[key];
    }

    newData.public = true;

    const newItinerary = await this.Service.create(newData);
    sendResponse(
      httpStatus.OK,
      res,
      newItinerary,
      "Itinerary shared with all users",
    );
  }
}

export default ItineraryController;
