import AppError from "#utils/appError";
import UserService from "#services/user";
import BaseService from "#services/base";
import UserFollow from "#models/userFollow";
import NotificationService from "#services/notification";
import sendNewPostNotification from "#utils/notification";

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
    const [user, recipient] = await Promise.all([
      UserService.getDocById(data.userId, {
        raw: true,
        attributes: ["id", "name", "username", "profile"],
      }),
      UserService.getDocById(data.otherId, {
        attributes: ["id", "firebaseToken"],
      }),
    ]);

    await NotificationService.create({
      actorId: data.userId,
      recipientId: data.otherId,
      type: "FOLLOW",
      status: "UNREAD",
      title: "New Follower",
      message: null,
      entityId: user.id,
      metadata: user,
      scheduledFor: null,
      readAt: null,
      expiresAt: null,
    });

    await sendNewPostNotification([recipient.firebaseToken], {
      notification: {
        title: "New Follower",
        body: `${user.username} just started following you`,
      },
      data: {
        type: "FOLLOW",
        id: String(user.id),
        username: String(user.username),
        profile: String(user.profile),
      },
    });

    return { follow: true };
  }
}

export default UserFollowService;
