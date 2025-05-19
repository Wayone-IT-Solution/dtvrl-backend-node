import UserFollowService from "#services/userFollow";
import BaseController from "#controllers/base";

class UserFollowController extends BaseController {
  static Service = UserFollowService;
}

export default UserFollowController;
