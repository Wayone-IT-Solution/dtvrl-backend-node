import ReelService from "#services/reel";
import BaseService from "#services/base";
import UserService from "#services/user";
import ReelComment from "#models/reelComment";
import NotificationService from "#services/notification";
import sendNewPostNotification from "#utils/notification";

class ReelCommentService extends BaseService {
  static Model = ReelComment;

  static async create(data) {
    const { reelId, userId } = data;

    const reelData = ReelService.getDocById(reelId, {
      include: [
        {
          model: UserService.Model,
          as: "user",
          attributes: ["id", "firebaseToken", "name"],
        },
      ],
    });

    const commentData = super.create(data);
    const commenterData = UserService.getDocById(userId);

    const [reel, comment, commenter] = await Promise.all([
      reelData,
      commentData,
      commenterData,
    ]);

    const notification = {
      title: `New comment on your reel`,
      body: `${commenter.username} just commented on your reel`,
    };

    const tokenData = {
      notification,
      data: {
        type: "REEL_COMMENT",
        id: String(reelId),
        userId: String(userId),
        reelId: String(reelId),
        commentId: String(comment.id),
      },
    };

    const firebaseToken = reel.user.firebaseToken;

    if (Number(userId) !== reel.userId) {
      const notificationData = {
        actorId: userId,
        recipientId: reel.userId,
        type: "REEL_COMMENT",
        status: "UNREAD",
        title: `${commenter.username} commented on your reel`,
        message: comment.comment ? `${comment.comment.slice(0, 100)}${comment.comment.length > 100 ? "..." : ""}` : null,
        entityId: reelId,
      };

      const promises = [NotificationService.Model.create(notificationData)];

      if (firebaseToken) {
        promises.push(sendNewPostNotification([firebaseToken], tokenData).catch((e) => console.error("FCM error:", e)));
      }

      await Promise.allSettled(promises);
    }

    return comment;
  }

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true });
  }
}

export default ReelCommentService;
