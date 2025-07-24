import Post from "#models/post";
import UserService from "#services/user";
import BaseService from "#services/base";
import UserFollowService from "#services/userFollow";
import { session } from "#middlewares/requestSession";
import sendNewPostNotification from "#utils/notification";
import NotificationService from "#services/notification";

class PostService extends BaseService {
  static Model = Post;

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

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true });
  }
}

export default PostService;
