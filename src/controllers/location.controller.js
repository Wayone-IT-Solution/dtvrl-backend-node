import User from "#models/user";
import httpStatus from "http-status";
import LocationService from "#services/location";
import BaseController from "#controllers/base";
import LocationReview from "#models/locationReview";
import { sendResponse } from "#utils/response";
import AppError from "#utils/appError";

class LocationController extends BaseController {
  static Service = LocationService;

  static async create(req, res, next) {
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

    // Check if location already exists
    let data = await this.Service.get(null, { lat, lng }, options);

    if (data.length > 1) {
      throw new AppError({
        status: false,
        message: "Duplicate location entries detected. Please report to admin.",
        httpStatus: httpStatus.CONFLICT,
      });
    }

    // If not found, try to create
    if (!data.length) {
      try {
        const created = await this.Service.create({ lat, lng, name });
        data = [created];
      } catch (err) {
        if (err.name === "SequelizeUniqueConstraintError") {
          // In case of race condition, get the existing entry again
          data = await this.Service.get(null, { lat, lng }, options);
        } else {
          throw err; // Rethrow any other error
        }
      }
    }

    sendResponse(
      httpStatus.OK,
      res,
      data[0],
      `${this.Service.Model.updatedName()} fetched successfully`,
    );
  }
}

export default LocationController;
