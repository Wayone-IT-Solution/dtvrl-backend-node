import PostService from "#services/post";
import BaseService from "#services/base";
import UserService from "#services/user";
import PostComment from "#models/postComment";
import NotificationService from "#services/notification";
import sendNewPostNotification from "#utils/notification";

class PostCommentService extends BaseService {
  static Model = PostComment;

  static async create(data) {
    const { postId, userId, content } = data;

    const postData = PostService.getDocById(postId, {
      include: [
        {
          model: UserService.Model,
          as: "user",
          attributes: ["id", "firebaseToken", "name"],
        },
      ],
    });

    const postCommentData = super.create(data);
    const commenterData = UserService.getDocById(userId);

    const [post, comment, commenter] = await Promise.all([
      postData,
      postCommentData,
      commenterData,
    ]);

    // Firebase notification setup
    const notification = {
      title: `New comment on your post`,
      body: `${commenter.username} just commented on your post`,
    };

    const tokenData = {
      notification,
      data: {
        type: "POST_COMMENT",
        id: String(postId),
        userId: String(userId),
        postId: String(postId),
        commentId: String(comment.id),
      },
    };

    const firebaseToken = post.user.firebaseToken;

    // Only notify if someone else commented on the post (not self-comment)
    if (Number(userId) !== post.userId) {
      // Create database notification record
      const notificationData = {
        actorId: userId,
        recipientId: post.userId,
        type: "POST_COMMENT",
        status: "UNREAD",
        title: `${commenter.username} commented on your post`,
        message: comment.comment
          ? `"${comment.comment.slice(0, 100)}${comment.comment.length > 100 ? "..." : ""}}"`
          : null,
        entityId: postId,
        metadata: {
          id: postId,
        },
        scheduledFor: null,
        readAt: null,
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

    return comment;
  }

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true });
  }
}

export default PostCommentService;
