import BaseService from "#services/base";
import UserFollow from "#models/userFollow";

class UserFollowService extends BaseService {
  static Model = UserFollow;
}

export default UserFollowService;
