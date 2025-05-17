import User from "#models/user";
import BaseService from "#services/base";

class UserService extends BaseService {
  static Model = User;
}

export default UserService;
