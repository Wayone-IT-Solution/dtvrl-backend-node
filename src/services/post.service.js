import Post from "#models/post";
import User from "#models/user";
import UserFollow from "#models/userFollow";
import BaseService from "#services/base";
import sequelize from "#configs/database";
import { Op, QueryTypes } from "sequelize";
import UserService from "#services/user";
import UserFollowService from "#services/userFollow";
import { session } from "#middlewares/requestSession";
import sendNewPostNotification from "#utils/notification";
import NotificationService from "#services/notification";
import UserBlockService from "#services/userBlock";

class PostService extends BaseService {
  static Model = Post;

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
      distinct: true,
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

    const posts = await this.Model.findAll({
      attributes: ["locationLat", "locationLng"],
      include: [
        {
          model: User,
          attributes: [],
          where: { isPrivate: false },
          required: true,
        },
      ],
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

    for (const post of posts) {
      if (
        post.locationLat === null ||
        post.locationLat === undefined ||
        post.locationLng === null ||
        post.locationLng === undefined
      ) {
        continue;
      }

      const latBucket =
        Math.round((Number(post.locationLat) || 0) / size) * size;
      const lngBucket =
        Math.round((Number(post.locationLng) || 0) / size) * size;

      const key = `${latBucket}:${lngBucket}`;
      if (!buckets.has(key)) {
        buckets.set(key, { lat: latBucket, lng: lngBucket, count: 0 });
      }
      buckets.get(key).count += 1;
    }

    return Array.from(buckets.values());
  }

  static async getNearbyPosts({ lat, lng, radius, page = 1, limit = 20 }) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    const postTable = this.Model.getTableName().toString();
    const userTable = User.getTableName().toString();

    const distanceExpression = `
      6371 * acos(
        LEAST(
          1,
          GREATEST(
            -1,
            cos(radians(:lat)) * cos(radians(p."locationLat")) *
            cos(radians(p."locationLng") - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(p."locationLat"))
          )
        )
      )
    `;

    const baseWhere = `
      p."deletedAt" IS NULL
      AND p."visibility" = 'public'
      AND u."isPrivate" = false
      AND p."locationLat" IS NOT NULL
      AND p."locationLng" IS NOT NULL
    `;

    const replacements = {
      lat,
      lng,
      radius,
      limit: limitNum,
      offset,
    };

    const items = await sequelize.query(
      `
      SELECT
        p.*,
        ${distanceExpression} AS "distanceKm"
      FROM "${postTable}" AS p
      INNER JOIN "${userTable}" AS u ON u."id" = p."userId"
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
      FROM "${postTable}" AS p
      INNER JOIN "${userTable}" AS u ON u."id" = p."userId"
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

  static async create(data) {
    const userId = session.get("userId");
    const post = await super.create(data);

    const customOptions = {
      include: [
        {
          model: UserService.Model,
          as: "user",
          attributes: ["firebaseToken", "id"],
        },
      ],
      attributes: ["id", "userId"],
    };

    const options = UserFollowService.getOptions(
      { pagination: false, otherId: userId },
      customOptions,
    );

    const [followers, user] = await Promise.all([
      UserFollowService.get(null, { otherId: userId }, options),
      UserService.getDocById(userId),
    ]);

    const notificationPayloads = [];

    const firebaseTokens = followers.map((ele) => {
      const notificationData = {
        actorId: userId,
        recipientId: ele.user.id,
        type: "POST_CREATED",
        status: "UNREAD",
        title: `New post by ${user.name}`,
        message: post.caption?.slice(20),
        entityId: post.id,
        metadata: null,
        scheduledFor: null,
        readAt: null,
        expiresAt: null,
      };

      notificationPayloads.push(notificationData);
      return ele.user.firebaseToken;
    });

    const notification = {
      title: `New Post from ${user.username}`,
      body: "Check out our latest update – you’ll love it!",
    };

    const tokenData = {
      notification,
      data: {
        type: "POST_CREATED",
        id: String(post.id),
        userId: String(userId),
      },
    };

    sendNewPostNotification(firebaseTokens, tokenData)
      .then((ele) => {
        console.log(ele);
      })
      .catch((e) => {
        console.log(e);
      });

    await NotificationService.Model.bulkCreate(notificationPayloads, {
      transaction: session.get("transaction"),
    });

    return post;
  }

  static async updateDocById(id, data) {
    return super.update(id, data);
  }

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true });
  }

  static async deleteDocById(id) {
    return this.deleteDoc(id);
  }
}

export default PostService;
