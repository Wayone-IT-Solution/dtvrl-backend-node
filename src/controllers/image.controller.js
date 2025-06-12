import ImageService from "#services/image";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import AppError from "#utils/appError";
import httpStatus from "http-status";
import { sendResponse } from "#utils/response";

class ImageController extends BaseController {
  static Service = ImageService;

  static async create(req, res, next) {
    session.set("files", null);

    const { memoryId } = req.body;
    if (!req.files.length) {
      throw new AppError({
        status: false,
        message: "Image is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    for (const image of req.files) {
      image.fieldname = "name";
      session.set("files", [image]);
      const images = await this.Service.create({ memoryId });
    }

    sendResponse(httpStatus.OK, res, null, "Images uploaded successfully");
  }
}

export default ImageController;
