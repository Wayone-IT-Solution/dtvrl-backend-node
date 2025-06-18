import BaseService from "#services/base";
import UserFollow from "#models/userFollow";

class UserFollowService extends BaseService {
  static Model = UserFollow;

  static async create(data) {
    const existing = await this.getDoc(data, { allowNull: true });
    if (existing) {
      await existing.destroy({ force: true });
      return {
        follow: false,
      };
    }
    await super.create(data);
    return { follow: true };
  }
}

export default UserFollowService;
