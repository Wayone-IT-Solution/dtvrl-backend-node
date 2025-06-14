import StampService from "#services/stamp";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";

class StampController extends BaseController {
  static Service = StampService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.create(req, res, next);
  }

  static async get(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.get(req, res, next);
  }
}

export default StampController;
