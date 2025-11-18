// src/services/postLike.js
import PostLike from "#models/postLike";
import Post  from "../models/index.js"; // if using index.js export
import UserService from "#services/user";
import BaseService from "#services/base";
import PostService from "#services/post";
import NotificationService from "#services/notification";
import sendNewPostNotification from "#utils/notification";

class PostLikeService extends BaseService {
  static Model = PostLike;

  static async create(data) {
    const { postId, userId } = data;

    // get post and creator
    const post = await PostService.Model.findByPk(postId, {
      include: [
        {
          model: UserService.Model,
          as: "user",
          attributes: ["id", "firebaseToken", "name", "username"],
        },
      ],
    });

    if (!post) throw new Error("Post not found");

    const postCreator = await UserService.getDocById(userId);

    const postLike = await super.create(data);

    // Do NOT notify if user likes their own post
    if (post.user.id !== userId) {
      const firebaseToken = post.user.firebaseToken;

      const notification = {
        title: `New Like`,
        body: `${postCreator.name} liked your post`,
      };

      const payload = {
        notification,
        data: {
          type: "POST_LIKE",
          postId: String(postId),
          userId: String(userId),
        },
      };

      // DB notification
      await NotificationService.Model.create({
        actorId: userId,
        recipientId: post.user.id,
        type: "POST_LIKE",
        status: "UNREAD",
        title: `${postCreator.username} liked your post`,
        message: post.caption ? post.caption.slice(0, 40) : "",
        entityId: postId,
      });

      // Firebase notification (if exists)
      if (firebaseToken) {
        sendNewPostNotification([firebaseToken], payload).catch((e) =>
          console.error("FCM error:", e)
        );
      }
    }

    return postLike;
  }
}

export default PostLikeService;
