import BucketService from "#services/bucket";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import AppError from "#utils/appError";

class BucketController extends BaseController {
  static Service = BucketService;

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
}

export default BucketController;
