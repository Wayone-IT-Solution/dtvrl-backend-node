import UserFollowService from "#services/userFollow";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";

class UserFollowController extends BaseController {
  static Service = UserFollowService;

  static async create(req, res, next) {
    req.body.userId = session.get("userId");
    return await super.create(req, res, next);
  }
}

export default UserFollowController;
