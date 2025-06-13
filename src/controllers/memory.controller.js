import MemoryService from "#services/memory";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";

class MemoryController extends BaseController {
  static Service = MemoryService;

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

export default MemoryController;
