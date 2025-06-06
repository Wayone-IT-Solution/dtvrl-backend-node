import ItineraryService from "#services/itinerary";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import AppError from "#utils/appError";
import ItineraryShareList from "#models/itineraryShareList";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";

class ItineraryController extends BaseController {
  static Service = ItineraryService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.create(req, res, next);
  }

  static async get(req, res, next) {
    const userId = session.get("userId");
    req.query.userId = userId;
    return await super.get(req, res, next);
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
}

export default ItineraryController;
