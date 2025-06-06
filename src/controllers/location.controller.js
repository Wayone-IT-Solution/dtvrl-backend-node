import LocationService from "#services/location";
import BaseController from "#controllers/base";
import LocationReview from "#models/locationReview";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";

class LocationController extends BaseController {
  static Service = LocationService;

  static async get(req, res, next) {
    const { id } = req.params;
    const customOptions = {
      include: [
        {
          model: LocationReview,
        },
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await this.Service.get(id, req.query, options);
    sendResponse(
      httpStatus.OK,
      res,
      data,
      `${this.Service.Model.updatedName()} fetched successfully`,
    );
  }
}

export default LocationController;
