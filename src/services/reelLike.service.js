import ReelLike from "#models/reelLike";
import BaseService from "#services/base";
import ReelService from "#services/reel";
import UserService from "#services/user";
import NotificationService from "#services/notification";
import sendNewPostNotification from "#utils/notification";

class ReelLikeService extends BaseService {
  static Model = ReelLike;

  static async create(data) {
    const { reelId, userId } = data;

    const reel = await ReelService.getDocById(reelId, {
      include: [
        {
          model: UserService.Model,
          as: "user",
          attributes: ["id", "firebaseToken", "name", "username"],
        },
      ],
    });

    if (!reel) throw new Error("Reel not found");

    const creator = await UserService.getDocById(userId);

    const reelLike = await super.create(data);

    // Notify reel owner if not self
    if (reel.user && Number(reel.user.id) !== Number(userId)) {
      const firebaseToken = reel.user.firebaseToken;
      const notification = {
        title: `New Like`,
        body: `${creator.name} liked your reel`,
      };

      const payload = {
        notification,
        data: {
          type: "REEL_LIKE",
          reelId: String(reelId),
          userId: String(userId),
        },
      };

      await NotificationService.Model.create({
        actorId: userId,
        recipientId: reel.user.id,
        type: "REEL_LIKE",
        status: "UNREAD",
        title: `${creator.username} liked your reel`,
        message: reel.caption ? reel.caption.slice(0, 40) : "",
        entityId: reelId,
      });

      if (firebaseToken) {
        sendNewPostNotification([firebaseToken], payload).catch((e) =>
          console.error("FCM error:", e),
        );
      }
    }

    return reelLike;
  }
}

export default ReelLikeService;
