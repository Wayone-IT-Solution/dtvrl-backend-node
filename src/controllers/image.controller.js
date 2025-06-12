import ImageService from "#services/image";
import BaseController from "#controllers/base";

class ImageController extends BaseController {
  static Service = ImageService;

  static async create(req, res, next) {
    console.log(req.files);
    console.log(req.body);
  }
}

export default ImageController;
