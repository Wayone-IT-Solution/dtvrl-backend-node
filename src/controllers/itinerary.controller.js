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
    const userId = session.get("userId");

    const { isPublic = true } = req.query;

    const customOptions = {
      include: [
        {
          model: ItineraryShareList,
          required: false,
          where: { userId },
        },
      ],
      where: {
        deletedAt: null,
        [Op.or]: [
          { public: isPublic },
          {
            id: {
              [Op.in]: Sequelize.literal(
                `(SELECT "itineraryId" FROM "ItineraryShareLists" WHERE "userId" = ${userId} AND "deletedAt" IS NULL)`,
              ),
            },
          },
        ],
      },
    };

    const options = this.Service.getOptions({}, customOptions);
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
