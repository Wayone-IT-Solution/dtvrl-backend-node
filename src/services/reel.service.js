import Reel from "#models/reel";
import UserFollow from "#models/userFollow";
import BaseService from "#services/base";
import sequelize from "#configs/database";
import { Op, QueryTypes } from "sequelize";
import UserBlockService from "#services/userBlock";

class ReelService extends BaseService {
  static Model = Reel;

  static toNumber(value, fallback = null) {
    const num = Number(value);
    return Number.isNaN(num) ? fallback : num;
  }

  static haversineDistance(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371; // km

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static async findWithPagination({
    where = {},
    page = 1,
    limit = 10,
    order = [["createdAt", "DESC"]],
    include,
  }) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const { rows, count } = await this.Model.findAndCountAll({
      where,
      offset,
      limit: limitNum,
      order,
      include,
      distinct: true, // for joins
    });

    const totalPages = Math.max(1, Math.ceil(count / limitNum));

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

  static async getByUserIdWithPagination({ userId, page, limit, visibility }) {
    const where = { userId };

    if (Array.isArray(visibility) && visibility.length) {
      where.visibility = { [Op.in]: visibility };
    } else if (typeof visibility === "string") {
      where.visibility = visibility;
    }

    return this.findWithPagination({ where, page, limit });
  }

  static async getByVisibilityWithPagination({
    visibility,
    page,
    limit,
    userId,
  }) {
    const where = {};

    if (Array.isArray(visibility) && visibility.length) {
      where.visibility = { [Op.in]: visibility };
    } else if (typeof visibility === "string") {
      where.visibility = visibility;
    }

    if (userId) {
      where.userId = userId;
    }

    return this.findWithPagination({ where, page, limit });
  }

  static async getFollowerFeed({ userId, page, limit }) {
    const follows = await UserFollow.findAll({
      where: { userId },
      attributes: ["otherId"],
      raw: true,
    });

    const blockedUserIds = await UserBlockService.getBlockedUserIdsFor(userId);

    const followedIds = follows.map((row) => row.otherId);
    const allowedAuthorIds = followedIds.filter(
      (followedId) => !blockedUserIds.includes(followedId),
    );
    if (!allowedAuthorIds.includes(userId)) {
      allowedAuthorIds.push(userId);
    }

    if (!allowedAuthorIds.length) {
      return {
        result: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: Number(page) || 1,
          itemsPerPage: Number(limit) || 10,
        },
      };
    }

    const where = {
      userId: { [Op.in]: allowedAuthorIds },
      visibility: { [Op.in]: ["public", "followers"] },
    };

    return this.findWithPagination({
      where,
      page,
      limit,
      order: [["createdAt", "DESC"]],
    });
  }

  static async getHeatmapData({ bounds, bucketSize = 0.5 }) {
    if (!bounds) return [];
    const { northEast, southWest } = bounds;

    const reels = await this.Model.findAll({
      attributes: ["locationLat", "locationLng"],
      where: {
        visibility: "public",
        locationLat: {
          [Op.between]: [southWest.lat, northEast.lat],
        },
        locationLng: {
          [Op.between]: [southWest.lng, northEast.lng],
        },
      },
      raw: true,
    });

    const buckets = new Map();
    const size = bucketSize || 0.5;

    for (const reel of reels) {
      if (
        reel.locationLat === null ||
        reel.locationLat === undefined ||
        reel.locationLng === null ||
        reel.locationLng === undefined
      ) {
        continue;
      }
      const latBucket =
        Math.round((Number(reel.locationLat) || 0) / size) * size;
      const lngBucket =
        Math.round((Number(reel.locationLng) || 0) / size) * size;

      const key = `${latBucket}:${lngBucket}`;
      if (!buckets.has(key)) {
        buckets.set(key, { lat: latBucket, lng: lngBucket, count: 0 });
      }
      buckets.get(key).count += 1;
    }

    return Array.from(buckets.values());
  }

  static async getNearbyReels({ lat, lng, radius, page = 1, limit = 20 }) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    const distanceExpression = `
      6371 * acos(
        LEAST(
          1,
          GREATEST(
            -1,
            cos(radians(:lat)) * cos(radians(r."locationLat")) *
            cos(radians(r."locationLng") - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(r."locationLat"))
          )
        )
      )
    `;

    const baseWhere = `
      r."deletedAt" IS NULL
      AND r."visibility" = 'public'
      AND r."locationLat" IS NOT NULL
      AND r."locationLng" IS NOT NULL
    `;

    const replacements = { lat, lng, radius, limit: limitNum, offset: offset };

    const items = await sequelize.query(
      `
      SELECT
        r.*,
        ${distanceExpression} AS "distanceKm"
      FROM "Reels" AS r
      WHERE
        ${baseWhere}
        AND ${distanceExpression} <= :radius
      ORDER BY "distanceKm" ASC
      LIMIT :limit OFFSET :offset;
    `,
      { replacements, type: QueryTypes.SELECT },
    );

    const [{ count: totalItemsRaw } = { count: 0 }] = await sequelize.query(
      `
      SELECT COUNT(*)::int AS count
      FROM "Reels" AS r
      WHERE
        ${baseWhere}
        AND ${distanceExpression} <= :radius;
    `,
      { replacements, type: QueryTypes.SELECT },
    );

    const totalItems = Number(totalItemsRaw) || 0;
    const totalPages =
      limitNum === 0 ? 0 : Math.max(1, Math.ceil(totalItems / limitNum));

    const serialized = items.map((item) => ({
      ...item,
      distanceKm: Number(item.distanceKm),
    }));

    return {
      result: serialized,
      pagination: {
        totalItems,
        totalPages,
        currentPage: pageNum,
        itemsPerPage: limitNum,
      },
    };
  }
}

export default ReelService;
