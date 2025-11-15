import BaseService from "#services/base";
import AiChatMessage from "#models/aiChatMessage";

class AiChatMessageService extends BaseService {
  static Model = AiChatMessage;

  static async findWithPagination({
    where = {},
    page = 1,
    limit = 50,
    order = [["createdAt", "ASC"]],
    include,
  }) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const offset = (pageNum - 1) * limitNum;

    const { rows, count } = await this.Model.findAndCountAll({
      where,
      include,
      order,
      limit: limitNum,
      offset,
      distinct: true,
    });

    const totalPages =
      limitNum === 0 ? 0 : Math.max(1, Math.ceil(count / limitNum));

    return {
      result: rows,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage: pageNum,
        itemsPerPage: limitNum,
      },
    };
  }
}

export default AiChatMessageService;
