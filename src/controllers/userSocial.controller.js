import httpStatus from "http-status";
import AppError from "#utils/appError";
import { sendResponse } from "#utils/response";
import { session } from "#middlewares/requestSession";
import User from "#models/user";
import UserFollow from "#models/userFollow";
import FollowRequestService from "#services/followRequest";
import UserBlockService from "#services/userBlock";
import NotificationService from "#services/notification";
import sendNewPostNotification from "#utils/notification";
import { Op, fn, col } from "sequelize";

class UserSocialController {
  static async sendSocialNotification({
    actor,
    recipient,
    title,
    body,
    entityId,
    metadata = {},
    data = {},
  }) {
    if (!recipient) return;

    await NotificationService.create({
      actorId: actor?.id ?? null,
      recipientId: recipient.id,
      type: "FOLLOW",
      status: "UNREAD",
      title,
      message: body,
      entityId: entityId ?? null,
      metadata,
      scheduledFor: null,
      readAt: null,
      expiresAt: null,
    });

    if (recipient.firebaseToken) {
      await sendNewPostNotification([recipient.firebaseToken], {
        notification: {
          title,
          body: body ?? title,
        },
        data: {
          type: "FOLLOW",
          ...Object.entries(data).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null) {
              acc[key] = String(value);
            }
            return acc;
          }, {}),
        },
      });
    }
  }

  static getCurrentUserId(req) {
    return (
      session.get("userId") ??
      req.user?.userId ??
      session.get("payload")?.userId ??
      null
    );
  }

  static parsePagination(query = {}) {
    let page = Number(query.page) || 1;
    let limit = Number(query.limit) || 10;

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    return {
      page,
      limit,
      offset: (page - 1) * limit,
    };
  }

  static parseSort(query = {}, allowedFields, defaultField = "createdAt") {
    const requestedField = String(query.sortBy || "").trim();
    const sortBy = allowedFields.includes(requestedField)
      ? requestedField
      : defaultField;

    const requestedOrder = String(query.sortOrder || "").toUpperCase();
    const sortOrder = requestedOrder === "ASC" ? "ASC" : "DESC";

    return { sortBy, sortOrder };
  }

  static parseStatusFilter(value) {
    if (!value) return null;
    const allowed = new Set(["pending", "accepted", "rejected"]);
    const parsed = String(value)
      .split(",")
      .map((status) => status.trim().toLowerCase())
      .filter((status) => allowed.has(status));

    return parsed.length ? parsed : null;
  }

  static buildDateRangeFilter(query = {}) {
    const { startDate, endDate } = query;

    const filter = {};
    if (startDate) {
      const parsed = new Date(startDate);
      if (!Number.isNaN(parsed.getTime())) {
        filter[Op.gte] = parsed;
      }
    }

    if (endDate) {
      const parsed = new Date(endDate);
      if (!Number.isNaN(parsed.getTime())) {
        filter[Op.lte] = parsed;
      }
    }

    return Object.keys(filter).length ? filter : null;
  }

  static buildUserSearchWhere(searchTerm) {
    const term = String(searchTerm || "").trim();
    if (!term) {
      return null;
    }

    const like = `%${term}%`;
    return {
      [Op.or]: [
        { name: { [Op.iLike]: like } },
        { username: { [Op.iLike]: like } },
      ],
    };
  }

  static buildOrder(sortBy, sortOrder, alias) {
    if (sortBy === `${alias}Name`) {
      return [[{ model: User, as: alias }, "name", sortOrder]];
    }
    if (sortBy === `${alias}Username`) {
      return [[{ model: User, as: alias }, "username", sortOrder]];
    }

    return [[sortBy, sortOrder]];
  }

  static buildPaginationMeta(totalItems, page, limit) {
    const itemsPerPage = limit;
    const totalPages =
      itemsPerPage === 0 ? 0 : Math.ceil(totalItems / itemsPerPage);

    return {
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage,
    };
  }

  static async getFollowRequestSummary(baseWhere, dateRangeFilter = null) {
    const where = { ...baseWhere };
    if (dateRangeFilter) {
      where.createdAt = dateRangeFilter;
    }

    const rows = await FollowRequestService.Model.findAll({
      where,
      attributes: [
        "status",
        [fn("COUNT", col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    const summary = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      total: 0,
    };

    for (const row of rows) {
      const status = row.status;
      const count = Number(row.count) || 0;
      if (summary[status] !== undefined) {
        summary[status] = count;
      }
      summary.total += count;
    }

    return summary;
  }

  // ---------- FOLLOW REQUESTS ----------

  static async sendFollowRequest(req, res) {
    const currentUserId = this.getCurrentUserId(req);
    const targetId = Number(req.params.id);

    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    if (!targetId || Number.isNaN(targetId)) {
      throw new AppError({
        message: "Invalid target user id",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    if (currentUserId === targetId) {
      throw new AppError({
        message: "You cannot follow yourself",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const targetUser = await User.findByPk(targetId, {
      attributes: ["id", "name", "username", "profile", "firebaseToken"],
    });
    if (!targetUser) {
      throw new AppError({
        message: "User not found",
        httpStatus: httpStatus.NOT_FOUND,
      });
    }

    const blockedIds =
      (await UserBlockService.getBlockedUserIdsFor(currentUserId)) || [];
    if (blockedIds.includes(targetId)) {
      throw new AppError({
        message: "You cannot send follow request due to block",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    const existingFollow = await UserFollow.findOne({
      where: { userId: currentUserId, otherId: targetId },
    });
    if (existingFollow) {
      return sendResponse(
        httpStatus.OK,
        res,
        existingFollow,
        "You are already following this user",
      );
    }

    const requesterUser = await User.findByPk(currentUserId, {
      attributes: ["id", "name", "username", "profile", "firebaseToken"],
    });

    const [request] = await FollowRequestService.Model.findOrCreate({
      where: { requesterId: currentUserId, targetId },
      defaults: { status: "pending" },
    });

    if (request.status === "rejected") {
      request.status = "pending";
      await request.save();
    }

    await this.sendSocialNotification({
      actor: requesterUser,
      recipient: targetUser,
      title: "New follow request",
      body: `${requesterUser.username} wants to follow you`,
      entityId: request.id,
      metadata: {
        context: "follow_request_received",
        requestId: request.id,
        requesterId: requesterUser.id,
        requesterUsername: requesterUser.username,
        requesterProfile: requesterUser.profile,
      },
      data: {
        action: "follow_request_received",
        requestId: request.id,
        requesterId: requesterUser.id,
      },
    });

    sendResponse(
      httpStatus.OK,
      res,
      request,
      "Follow request sent successfully",
    );
  }

  static async listIncomingRequests(req, res) {
    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const { page, limit, offset } = this.parsePagination(req.query);
    const { sortBy, sortOrder } = this.parseSort(
      req.query,
      [
        "id",
        "createdAt",
        "status",
        "requesterId",
        "requesterName",
        "requesterUsername",
      ],
      "createdAt",
    );
    const hasCustomStatus = req.query.status !== undefined;
    const rawStatusParam = hasCustomStatus ? req.query.status : "pending";
    const statusFilter =
      String(rawStatusParam).toLowerCase() === "all"
        ? null
        : this.parseStatusFilter(rawStatusParam);
    const dateRangeFilter = this.buildDateRangeFilter(req.query);
    const userSearchWhere = this.buildUserSearchWhere(req.query.search);

    const baseWhere = { targetId: currentUserId };
    const where = { ...baseWhere };

    if (statusFilter) {
      where.status = { [Op.in]: statusFilter };
    }
    if (dateRangeFilter) {
      where.createdAt = dateRangeFilter;
    }

    const order = this.buildOrder(sortBy, sortOrder, "requester");

    const { rows, count } = await FollowRequestService.Model.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "requester",
          attributes: ["id", "name", "username", "profile"],
          where: userSearchWhere ?? undefined,
          required: Boolean(userSearchWhere),
        },
      ],
      order,
      limit,
      offset,
      distinct: true,
    });

    const pagination = this.buildPaginationMeta(count, page, limit);
    const summary = await this.getFollowRequestSummary(
      baseWhere,
      dateRangeFilter,
    );

    sendResponse(
      httpStatus.OK,
      res,
      { result: rows, pagination, summary },
      "Incoming follow requests fetched successfully",
    );
  }

  static async listOutgoingRequests(req, res) {
    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const { page, limit, offset } = this.parsePagination(req.query);
    const { sortBy, sortOrder } = this.parseSort(
      req.query,
      [
        "id",
        "createdAt",
        "status",
        "targetId",
        "targetName",
        "targetUsername",
      ],
      "createdAt",
    );
    const statusFilter = this.parseStatusFilter(req.query.status);
    const dateRangeFilter = this.buildDateRangeFilter(req.query);
    const userSearchWhere = this.buildUserSearchWhere(req.query.search);

    const baseWhere = { requesterId: currentUserId };
    const where = { ...baseWhere };

    if (statusFilter) {
      where.status = { [Op.in]: statusFilter };
    }

    if (dateRangeFilter) {
      where.createdAt = dateRangeFilter;
    }

    const order = this.buildOrder(sortBy, sortOrder, "target");

    const { rows, count } = await FollowRequestService.Model.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "target",
          attributes: ["id", "name", "username", "profile"],
          where: userSearchWhere ?? undefined,
          required: Boolean(userSearchWhere),
        },
      ],
      order,
      limit,
      offset,
      distinct: true,
    });

    const pagination = this.buildPaginationMeta(count, page, limit);
    const summary = await this.getFollowRequestSummary(
      baseWhere,
      dateRangeFilter,
    );

    sendResponse(
      httpStatus.OK,
      res,
      { result: rows, pagination, summary },
      "Outgoing follow requests fetched successfully",
    );
  }

  static async respondToRequest(req, res) {
    const currentUserId = this.getCurrentUserId(req);
    const { id } = req.params;
    const { action } = req.body || {};

    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const request = await FollowRequestService.getDocById(id, {
      allowNull: true,
    });
    if (!request || request.targetId !== currentUserId) {
      throw new AppError({
        message: "Follow request not found",
        httpStatus: httpStatus.NOT_FOUND,
      });
    }

    if (!["accept", "reject"].includes(action)) {
      throw new AppError({
        message: "Invalid action",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const targetUser = await User.findByPk(currentUserId, {
      attributes: ["id", "name", "username", "profile", "firebaseToken"],
    });
    const requesterUser = await User.findByPk(request.requesterId, {
      attributes: ["id", "name", "username", "profile", "firebaseToken"],
    });

    if (action === "accept") {
      request.status = "accepted";
      await request.save();

      const [follow] = await UserFollow.findOrCreate({
        where: {
          userId: request.requesterId,
          otherId: request.targetId,
        },
      });

      await this.sendSocialNotification({
        actor: targetUser,
        recipient: requesterUser,
        title: "Follow request accepted",
        body: `${targetUser.username} accepted your follow request`,
        entityId: follow.id,
        metadata: {
          context: "follow_request_accepted",
          followId: follow.id,
          targetId: targetUser.id,
          targetUsername: targetUser.username,
        },
        data: {
          action: "follow_request_accepted",
          followId: follow.id,
          targetId: targetUser.id,
        },
      });

      return sendResponse(
        httpStatus.OK,
        res,
        { request, follow },
        "Follow request accepted",
      );
    }

    request.status = "rejected";
    await request.save();

    await this.sendSocialNotification({
      actor: targetUser,
      recipient: requesterUser,
      title: "Follow request rejected",
      body: `${targetUser.username} rejected your follow request`,
      entityId: request.id,
      metadata: {
        context: "follow_request_rejected",
        requestId: request.id,
        targetId: targetUser.id,
        targetUsername: targetUser.username,
      },
      data: {
        action: "follow_request_rejected",
        requestId: request.id,
        targetId: targetUser.id,
      },
    });

    sendResponse(
      httpStatus.OK,
      res,
      request,
      "Follow request rejected",
    );
  }

  // ---------- BLOCK / UNBLOCK ----------

  static async blockUser(req, res) {
    const currentUserId = this.getCurrentUserId(req);
    const targetId = Number(req.params.id);

    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    if (!targetId || Number.isNaN(targetId)) {
      throw new AppError({
        message: "Invalid target user id",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    if (currentUserId === targetId) {
      throw new AppError({
        message: "You cannot block yourself",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const targetUser = await User.findByPk(targetId);
    if (!targetUser) {
      throw new AppError({
        message: "User not found",
        httpStatus: httpStatus.NOT_FOUND,
      });
    }

    const [block] = await UserBlockService.Model.findOrCreate({
      where: { blockerId: currentUserId, blockedId: targetId },
    });

    await Promise.all([
      UserFollow.destroy({
        where: { userId: currentUserId, otherId: targetId },
      }),
      UserFollow.destroy({
        where: { userId: targetId, otherId: currentUserId },
      }),
      FollowRequestService.Model.destroy({
        where: { requesterId: currentUserId, targetId },
      }),
      FollowRequestService.Model.destroy({
        where: { requesterId: targetId, targetId: currentUserId },
      }),
    ]);

    sendResponse(httpStatus.OK, res, block, "User blocked successfully");
  }

  static async unblockUser(req, res) {
    const currentUserId = this.getCurrentUserId(req);
    const targetId = Number(req.params.id);

    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    if (!targetId || Number.isNaN(targetId)) {
      throw new AppError({
        message: "Invalid target user id",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    await UserBlockService.Model.destroy({
      where: { blockerId: currentUserId, blockedId: targetId },
    });

    sendResponse(
      httpStatus.OK,
      res,
      { unblockedUserId: targetId },
      "User unblocked successfully",
    );
  }

  static async listBlockedUsers(req, res) {
    const currentUserId = this.getCurrentUserId(req);
    if (!currentUserId) {
      throw new AppError({
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const { page, limit, offset } = this.parsePagination(req.query);
    const { sortBy, sortOrder } = this.parseSort(
      req.query,
      [
        "id",
        "createdAt",
        "blockedId",
        "blockedUserName",
        "blockedUserUsername",
      ],
      "createdAt",
    );
    const dateRangeFilter = this.buildDateRangeFilter(req.query);
    const userSearchWhere = this.buildUserSearchWhere(req.query.search);

    const baseWhere = { blockerId: currentUserId };
    const where = { ...baseWhere };
    if (dateRangeFilter) {
      where.createdAt = dateRangeFilter;
    }

    const order = this.buildOrder(sortBy, sortOrder, "blockedUser");

    const { rows, count } = await UserBlockService.Model.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "blockedUser",
          attributes: ["id", "name", "username", "profile"],
          where: userSearchWhere ?? undefined,
          required: Boolean(userSearchWhere),
        },
      ],
      order,
      limit,
      offset,
      distinct: true,
    });

    const pagination = this.buildPaginationMeta(count, page, limit);
    const summaryWhere = { ...baseWhere };
    if (dateRangeFilter) {
      summaryWhere.createdAt = dateRangeFilter;
    }
    const totalBlocked = await UserBlockService.Model.count({
      where: summaryWhere,
    });
    const summary = {
      totalBlocked,
      filteredBlocked: count,
    };

    sendResponse(
      httpStatus.OK,
      res,
      { result: rows, pagination, summary },
      "Blocked users fetched successfully",
    );
  }
}

export default UserSocialController;
