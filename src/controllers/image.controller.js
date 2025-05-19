import ImageService from "#services/image";
import BaseController from "#controllers/base";

class ImageController extends BaseController {
  static Service = ImageService;
}

export default ImageController;
