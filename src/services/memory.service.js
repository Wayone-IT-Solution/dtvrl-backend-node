import Memory from "#models/memory";
import BaseService from "#services/base";
import ImageService from "#services/image";
import UserFollow from "#models/userFollow";
import { deleteFile } from "#configs/awsS3";
import { session } from "#middlewares/requestSession";
import { Op, col, cast, where as sequelizeWhere, fn } from "sequelize";

class MemoryService extends BaseService {
  static Model = Memory;

  static buildEmptyResult(page = 1, limit = 10) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    return {
      result: [],
      pagination: {
        totalItems: 0,
        totalPages: 0,
        currentPage: pageNum,
        itemsPerPage: limitNum,
      },
    };
  }

  static async findWithPagination({
    where = {},
    page = 1,
    limit = 10,
    order = [["createdAt", "DESC"]],
    include,
    attributes,
  }) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const { rows, count } = await this.Model.findAndCountAll({
      where,
      include,
      attributes,
      order,
      limit: limitNum,
      offset,
      distinct: true,
    });

    const totalPages =
      count === 0
        ? 0
        : limitNum > 0
          ? Math.max(1, Math.ceil(count / limitNum))
          : 0;

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

  static async getFollowingIds(viewerId) {
    if (!viewerId) return [];

    const follows = await UserFollow.findAll({
      where: { userId: viewerId },
      attributes: ["otherId"],
      raw: true,
    });

    return follows.map((row) => row.otherId);
  }

  static buildViewerWhereClause(viewerId, followingIds = []) {
    const orConditions = [];

    if (viewerId) {
      orConditions.push({ userId: viewerId });
    }

    if (followingIds.length) {
      orConditions.push({
        userId: { [Op.in]: followingIds },
        privacy: "open_to_all",
      });
    }

    if (!orConditions.length) {
      return null;
    }

    return { [Op.or]: orConditions };
  }

  static async findForMapWithPrivacy({ viewerId, page = 1, limit = 10, bounds }) {
    const followingIds = await this.getFollowingIds(viewerId);
    const accessWhere = this.buildViewerWhereClause(viewerId, followingIds);

    if (!accessWhere) {
      return this.buildEmptyResult(page, limit);
    }

    const andConditions = [
      accessWhere,
      { latitude: { [Op.ne]: null } },
      { longitude: { [Op.ne]: null } },
    ];

    if (bounds) {
      // Safely cast string lat/lng with sanitation to avoid casting invalid values
      const latSanitized = fn(
        "NULLIF",
        fn("regexp_replace", col("latitude"), "[^0-9\\.-]+", "", "g"),
        "",
      );
      const lngSanitized = fn(
        "NULLIF",
        fn("regexp_replace", col("longitude"), "[^0-9\\.-]+", "", "g"),
        "",
      );

      const latNumeric = cast(latSanitized, "DOUBLE PRECISION");
      const lngNumeric = cast(lngSanitized, "DOUBLE PRECISION");

      andConditions.push(
        sequelizeWhere(latNumeric, {
          [Op.between]: [bounds.southWest.lat, bounds.northEast.lat],
        }),
      );
      andConditions.push(
        sequelizeWhere(lngNumeric, {
          [Op.between]: [bounds.southWest.lng, bounds.northEast.lng],
        }),
      );
    }

    const where = { [Op.and]: andConditions };

    return this.findWithPagination({
      where,
      page,
      limit,
      order: [["updatedAt", "DESC"]],
    });
  }

  static async findForTimelineWithPrivacy({ viewerId, page = 1, limit = 10 }) {
    const followingIds = await this.getFollowingIds(viewerId);
    const accessWhere = this.buildViewerWhereClause(viewerId, followingIds);

    if (!accessWhere) {
      return this.buildEmptyResult(page, limit);
    }

    return this.findWithPagination({
      where: accessWhere,
      page,
      limit,
      order: [["startDate", "DESC"]],
    });
  }

  static async deleteDoc(id) {
    const memory = await this.Model.findDocById(id);
    const images = await ImageService.Model.findAll({
      where: { memoryId: id },
    });
    const keys = [];

    const imagesMap = images.map((ele) => {
      ele.destroy({ force: true, transaction: session.get("transaction") });
      keys.push(ele.name);
    });

    imagesMap.push(
      memory.destroy({ force: true, transaction: session.get("transaction") }),
    );

    await Promise.all(imagesMap);

    const deletedImages = keys.map((ele) => {
      return deleteFile(ele);
    });

    await Promise.all(deletedImages);
  }
}

export default MemoryService;
