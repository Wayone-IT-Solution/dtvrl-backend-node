import httpStatus from "http-status";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import AppError from "#utils/appError";

import PostService from "#services/post";
import ReelService from "#services/reel";
import ItineraryService from "#services/itinerary";
import MemoryService from "#services/memory";
import UserSessionService from "#services/userSession";
import NotificationService from "#services/notification";
import MessageService from "#services/message";
import UserService from "#services/user";
import User from "#models/user";
import UserFollow from "#models/userFollow";
import { literal } from "sequelize";

class UserActivityController extends BaseController {
  // GET /api/user-activity/:userId
  static async getUserActivity(req, res) {
    const { userId } = req.params;
    if (!userId || Number.isNaN(Number(userId))) {
      throw new AppError({ message: "Invalid userId", httpStatus: httpStatus.BAD_REQUEST });
    }

    const q = req.query || {};

    // per-resource pagination params (optional)
    const postPage = Number(q.postPage) || 1;
    const postLimit = Number(q.postLimit) || 10;

    const reelPage = Number(q.reelPage) || 1;
    const reelLimit = Number(q.reelLimit) || 10;

    const itPage = Number(q.itPage) || 1;
    const itLimit = Number(q.itLimit) || 10;

    const memPage = Number(q.memPage) || 1;
    const memLimit = Number(q.memLimit) || 10;

    const sessPage = Number(q.sessPage) || 1;
    const sessLimit = Number(q.sessLimit) || 10;

    const notifPage = Number(q.notifPage) || 1;
    const notifLimit = Number(q.notifLimit) || 20;

    const chatPage = Number(q.chatPage) || 1;
    const chatLimit = Number(q.chatLimit) || 20;

    // run queries in parallel
    const promises = [];

    promises.push(
      PostService.getByUserIdWithPagination({ userId: Number(userId), page: postPage, limit: postLimit }),
    );

    promises.push(
      ReelService.getByUserIdWithPagination({ userId: Number(userId), page: reelPage, limit: reelLimit }),
    );

    // For services that extend BaseService, use BaseService.get with getOptions
    promises.push(
      ItineraryService.get(null, {}, ItineraryService.getOptions({ page: itPage, limit: itLimit })),
    );

    promises.push(
      MemoryService.get(null, {}, MemoryService.getOptions({ page: memPage, limit: memLimit })),
    );

    // sessions for the user
    promises.push(
      UserSessionService.get(null, {}, UserSessionService.getOptions({ page: sessPage, limit: sessLimit, userId: Number(userId) })),
    );

    // notifications where recipientId = userId (recent)
    promises.push(
      NotificationService.get(null, {}, NotificationService.getOptions({ page: notifPage, limit: notifLimit, recipientId: Number(userId) })),
    );

    // chat list for this user (recent chat summaries)
    promises.push(
      MessageService.getChatList(Number(userId), { page: chatPage, limit: chatLimit }),
    );

    // Also fetch user profile with following and followers
    const userPromise = User.findOne({
      where: { id: Number(userId) },
      attributes: {
        include: [
          [
            literal(`(
            SELECT COUNT(*)
            FROM "${UserFollow.tableName}" AS "followers"
            WHERE "followers"."otherId" = "User"."id"
          )`),
            "followersCount",
          ],
          [
            literal(`(
            SELECT COUNT(*)
            FROM "${UserFollow.tableName}" AS "followings"
            WHERE "followings"."userId" = "User"."id"
          )`),
            "followingCount",
          ],
        ],
      },
      include: [
        {
          model: UserFollow,
          as: "userFollowings",
          attributes: ["id", "userId", "otherId"],
          include: [
            {
              model: User,
              as: "otherUser",
              attributes: ["id", "name", "username", "profile", "email"],
            },
          ],
          required: false,
        },
        {
          model: UserFollow,
          as: "userFollowers",
          attributes: ["id", "userId", "otherId"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "username", "profile", "email"],
            },
          ],
          required: false,
        },
      ],
    }).catch(() => null);

    try {
      const [posts, reels, itineraries, memories, sessions, notifications, chats, userProfile] = await Promise.all([
        ...promises,
        userPromise,
      ]);

      const data = {
        user: userProfile ? userProfile.toJSON() : null,
        posts,
        reels,
        itineraries,
        memories,
        sessions,
        notifications,
        chats,
      };

      return sendResponse(httpStatus.OK, res, data, "User activity fetched successfully");
    } catch (err) {
      throw err;
    }
  }
}

export default UserActivityController;
