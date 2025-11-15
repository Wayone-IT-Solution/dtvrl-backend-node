import BaseService from "#services/base";
import UserBlock from "#models/userBlock";
import { Op } from "sequelize";

class UserBlockService extends BaseService {
  static Model = UserBlock;

  static async getBlockedUserIdsFor(viewerId) {
    if (!viewerId) {
      return [];
    }

    const rows = await this.Model.findAll({
      where: {
        [Op.or]: [{ blockerId: viewerId }, { blockedId: viewerId }],
      },
    });

    const result = new Set();
    for (const row of rows) {
      if (Number(row.blockerId) === Number(viewerId)) {
        result.add(row.blockedId);
      } else {
        result.add(row.blockerId);
      }
    }

    return Array.from(result);
  }
}

export default UserBlockService;

