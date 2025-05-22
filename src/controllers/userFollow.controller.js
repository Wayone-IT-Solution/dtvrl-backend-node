import UserFollowService from "#services/userFollow";
import BaseController from "#controllers/base";

class UserFollowController extends BaseController {
  static Service = UserFollowService;

  static async get(req, res, next) {
    const fields = ["userData.name", "userData.userName", "userData.profile"];
  }
}

export default UserFollowController;
