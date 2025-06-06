import User from "#models/user";
import httpStatus from "http-status";
import LocationService from "#services/location";
import BaseController from "#controllers/base";
import LocationReview from "#models/locationReview";
import { sendResponse } from "#utils/response";
import AppError from "#utils/appError";

class LocationController extends BaseController {
  static Service = LocationService;

  static async get(req, res, next) {
    const { lng, lat, name } = req.body;

    const customOptions = {
      include: [
        {
          model: LocationReview,
          include: [
            {
              model: User,
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    };

    const options = this.Service.getOptions({ lat, lng }, customOptions);
    let data = await this.Service.get(null, { lat, lng }, options);

    if (data.length && data.length !== 1) {
      throw new AppError({
        status: false,
        message: "Location co-ordinates mismatch, please report to admin",
        httpStatus: httpStatus.CONFLICT,
      });
    }

    if (!data.length) {
      data = await this.Service.create({ lat, lng, name });
    }

    sendResponse(
      httpStatus.OK,
      res,
      data,
      `${this.Service.Model.updatedName()} fetched successfully`,
    );
  }
}

export default LocationController;
