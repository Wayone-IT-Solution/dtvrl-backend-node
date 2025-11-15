import BaseService from "#services/base";
import FollowRequest from "#models/followRequest";

class FollowRequestService extends BaseService {
  static Model = FollowRequest;

  static async getPendingForTarget(userId, options = {}) {
    return this.Model.findAll({
      where: { targetId: userId, status: "pending" },
      ...options,
    });
  }

  static async getOutgoingForRequester(userId, options = {}) {
    return this.Model.findAll({
      where: { requesterId: userId },
      ...options,
    });
  }
}

export default FollowRequestService;

