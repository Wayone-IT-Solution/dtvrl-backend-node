// src/services/post.service.js
import {
  Post,
  User,
  PostComment,
  PostLike,
  PostShare,
  PostView,
  PostWasHere,
} from "../models/index.js";

import BaseService from "#services/base";
import { Op, QueryTypes } from "sequelize";
import sequelize from "#configs/database";
import UserFollow from "../models/userFollow.model.js";
import UserBlockService from "#services/userBlock";
import { session } from "#middlewares/requestSession";
import sendNewPostNotification from "#utils/notification";

class PostService extends BaseService {
  static Model = Post;

  // *** SAME includes as controller/service ***
  static fullIncludes = [
    { model: User, as: "user" },
    {
      model: PostComment,
      as: "comments",
      include: [{ model: User, as: "commentUser" }],
    },
    {
      model: PostLike,
      as: "likes",
      include: [{ model: User, as: "likeUser" }],
    },
    { model: PostShare, as: "shares" },
    { model: PostView, as: "views" },
    {
      model: PostWasHere,
      as: "wasHere",
      include: [{ model: User, as: "wasHereUser" }],
    },
  ];

  // PAGINATION
  static async findWithPagination({
    where = {},
    page = 1,
    limit = 10,
    order = [["createdAt", "DESC"]],
    include = PostService.fullIncludes,
  }) {
    const offset = (page - 1) * limit;

    const { rows, count } = await this.Model.findAndCountAll({
      where,
      offset,
      limit,
      order,
      include,
      distinct: true,
    });

    return {
      result: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  // POSTS BY USER
  static async getByUserIdWithPagination({
    userId,
    page,
    limit,
    include = PostService.fullIncludes,
    where = undefined,
  }) {
    const whereObj = { ...(where || {}), userId };
    return this.findWithPagination({
      where: whereObj,
      page,
      limit,
      include,
    });
  }

  // POSTS BY VISIBILITY
  static async getByVisibilityWithPagination({
    visibility,
    userId,
    page,
    limit,
    include = PostService.fullIncludes,
    where = undefined,
  }) {
    const whereObj = { ...(where || {}), visibility };
    if (userId) whereObj.userId = userId;
    return this.findWithPagination({ where: whereObj, page, limit, include });
  }

  // FOLLOWER FEED
  static async getFollowerFeed({ userId, page, limit, include = PostService.fullIncludes, where = {} }) {
    const follows = await UserFollow.findAll({
      where: { userId },
      attributes: ["otherId"],
      raw: true,
    });

    const blocked = await UserBlockService.getBlockedUserIdsFor(userId);

    const allowedUserIds = follows.map((f) => f.otherId).filter((id) => !blocked.includes(id));
    allowedUserIds.push(userId);

    const whereObj = {
      ...(where || {}),
      userId: { [Op.in]: allowedUserIds },
      visibility: { [Op.in]: ["public", "followers"] },
    };

    return this.findWithPagination({
      where: whereObj,
      page,
      limit,
      include,
    });
  }

  // CREATE POST + NOTIFY FOLLOWERS
  static async create(data) {
    const userId = session.get("userId");

    const post = await super.create(data);

    const followers = await UserFollow.findAll({
      where: { otherId: userId },
      include: [{ model: User, as: "user" }],
    });

    const tokens = followers.map((f) => f.user.firebaseToken).filter(Boolean);

    sendNewPostNotification(tokens, {
      notification: {
        title: "New Post",
        body: "Someone you follow just posted",
      },
    });

    return post;
  }

  // UPDATE POST
  static async updateDocById(id, data) {
    return super.update(id, data);
  }

  // DELETE POST
  static async deleteDocById(id) {
    const post = await this.Model.findByPk(id);
    if (!post) return;
    await post.destroy({ force: true });
  }

  // ----------------- NEW: HEATMAP -----------------
  /**
   * getHeatmapData({ bounds, bucketSize })
   * bounds: { northEast: {lat,lng}, southWest: {lat,lng} } OR raw query params
   * bucketSize: size of grid in degrees (default 0.5)
   *
   * This is a simple grid aggregation (no PostGIS). It groups posts by bucket.
   */
  static async getHeatmapData({ bounds, bucketSize = 0.5 }) {
    // bounds can be { northEast, southWest } or raw { ne_lat, ne_lng, sw_lat, sw_lng }
    let neLat, neLng, swLat, swLng;
    if (bounds?.northEast && bounds?.southWest) {
      neLat = Number(bounds.northEast.lat);
      neLng = Number(bounds.northEast.lng);
      swLat = Number(bounds.southWest.lat);
      swLng = Number(bounds.southWest.lng);
    } else {
      neLat = Number(bounds?.ne_lat || bounds?.neLat);
      neLng = Number(bounds?.ne_lng || bounds?.neLng);
      swLat = Number(bounds?.sw_lat || bounds?.swLat);
      swLng = Number(bounds?.sw_lng || bounds?.swLng);
    }

    if ([neLat, neLng, swLat, swLng].some((v) => Number.isNaN(v))) {
      throw new Error("Invalid bounds for heatmap");
    }

    // SQL: compute bucket indexes and count
    const sql = `
      SELECT
        FLOOR(("locationLat" / :bucketSize)) AS lat_bucket,
        FLOOR(("locationLng" / :bucketSize)) AS lng_bucket,
        COUNT(*) AS count
      FROM "Posts"
      WHERE "locationLat" BETWEEN :swLat AND :neLat
        AND "locationLng" BETWEEN :swLng AND :neLng
        AND "locationLat" IS NOT NULL
        AND "locationLng" IS NOT NULL
        AND "status" = 'active'
      GROUP BY lat_bucket, lng_bucket;
    `;

    const rows = await sequelize.query(sql, {
      replacements: { bucketSize, swLat, neLat, swLng, neLng },
      type: QueryTypes.SELECT,
    });

    // map back to lat/lng center for each bucket
    const result = rows.map((r) => {
      const lat = (Number(r.lat_bucket) + 0.5) * bucketSize;
      const lng = (Number(r.lng_bucket) + 0.5) * bucketSize;
      return { lat, lng, count: Number(r.count) };
    });

    return result;
  }

  // ----------------- NEW: NEARBY -----------------
  /**
   * getNearbyPosts({ lat, lng, radius (km), page, limit })
   * Uses Haversine formula in SQL.
   */
  static async getNearbyPosts({ lat, lng, radius = 50, page = 1, limit = 10, include = PostService.fullIncludes, where = {} }) {
    const offset = (page - 1) * limit;
    // Haversine in km (Earth radius ~6371)
    const haversine = `
      (6371 * acos(
         least(1.0, cos(radians(:lat)) * cos(radians("locationLat")) * cos(radians("locationLng") - radians(:lng))
         + sin(radians(:lat)) * sin(radians("locationLat")))
      ))
    `;

    // Note: filter out null lat/lng
    const whereSql = `
      WHERE "locationLat" IS NOT NULL
        AND "locationLng" IS NOT NULL
        AND ${haversine} <= :radius
        AND "status" = 'active'
    `;

    const sql = `
      SELECT p.*, ${haversine} AS distance
      FROM "Posts" p
      ${whereSql}
      ORDER BY distance ASC
      LIMIT :limit OFFSET :offset;
    `;

    const rows = await sequelize.query(sql, {
      replacements: { lat, lng, lng: lng, radius, limit, offset },
      model: Post,
      mapToModel: true,
      type: QueryTypes.SELECT,
    });

    // count total matching (approx) — run a simpler count
    const countSql = `
      SELECT COUNT(*)::int AS count
      FROM "Posts" p
      ${whereSql}
    `;
    const countRes = await sequelize.query(countSql, {
      replacements: { lat, lng, lng: lng, radius },
      type: QueryTypes.SELECT,
    });

    const total = Number(countRes[0]?.count || 0);

    // We don't eager-load associations via SQL result; load includes by IDs
    const ids = rows.map((r) => r.id);
    const postsWithIncludes = await Post.findAll({
      where: { id: { [Op.in]: ids } },
      include,
      order: [["createdAt", "DESC"]],
    });

    return {
      result: postsWithIncludes,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }
  static async deleteDoc(id) {
    const doc = await this.getDocById(id);
    // Perform hard delete for admin
    await doc.destroy({ force: true });
  }
}

export default PostService;
