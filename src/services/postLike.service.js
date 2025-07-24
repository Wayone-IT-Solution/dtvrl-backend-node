import PostLike from "#models/postLike";
import UserService from "#services/user";
import BaseService from "#services/base";
import PostService from "#services/post";
import NotificationService from "#services/notification";
import sendNewPostNotification from "#utils/notification";

class PostLikeService extends BaseService {
  static Model = PostLike;

  static async create(data) {
    const { postId, userId } = data;

    const postData = PostService.getDocById(postId, {
      include: [
        {
          model: UserService.Model,
          attributes: ["id", "firebaseToken", "name"], // Added name for notification
        },
      ],
    });

    const postLikeData = super.create(data);
    const postCreatorData = UserService.getDocById(userId);

    const [post, postLike, postCreator] = await Promise.all([
      postData,
      postLikeData,
      postCreatorData,
    ]);

    // Firebase notification setup
    const notification = {
      title: `New like on your post`,
      body: `${postCreator.name} just liked your post`,
    };

    const tokenData = {
      notification,
      data: {
        type: "POST_LIKE",
        id: String(postId),
        userId: String(userId),
        postId: String(postId),
      },
    };

    const firebaseToken = post.User.firebaseToken;

    // Only notify if someone else liked the post (not self-like)
    if (Number(userId) !== post.userId) {
      // Create database notification record
      const notificationData = {
        actorId: userId,
        recipientId: post.userId,
        type: "POST_LIKE",
        status: "UNREAD",
        title: `${postCreator.username} liked your post`,
        message: post.caption
          ? `"${post.caption.slice(0, 50)}${post.caption.length > 50 ? "..." : ""}}"`
          : null,
        entityId: postId,
        scheduledFor: null,
        readAt: null,
        metaDate: {
          id: postId,
        },
        expiresAt: null,
      };

      // Create notification in database and send Firebase notification
      const promises = [NotificationService.Model.create(notificationData)];

      // Only send Firebase notification if user has a token
      if (firebaseToken) {
        promises.push(
          sendNewPostNotification([firebaseToken], tokenData)
            .then((result) => {
              console.log("Firebase notification sent:", result);
              return result;
            })
            .catch((error) => {
              console.error("Firebase notification failed:", error);
              throw error;
            }),
        );
      }

      await Promise.allSettled(promises);
    }

    return postLike;
  }
  // FIX: like updation has to be fixed
  static async deleteDoc(userId) {}
}

export default PostLikeService;
