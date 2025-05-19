import BucketService from "#services/bucket";
import BaseController from "#controllers/base";

class BucketController extends BaseController {
  static Service = BucketService;
}

export default BucketController;
