import UserService from "#services/user";
import BaseController from "#controllers/base";

class UserController extends BaseController {
  static Service = UserService;
}

export default UserController;
