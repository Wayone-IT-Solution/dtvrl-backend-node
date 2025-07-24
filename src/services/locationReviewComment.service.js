import BaseService from "#services/base";
import UserService from "#services/user";
import LocationReviewService from "#services/locationReview";
import LocationReviewComment from "#models/locationReviewComment";

class LocationReviewCommentService extends BaseService {
  static Model = LocationReviewComment;

  static async create(data) {
    const { locationReviewId, userId } = data;

    const reviewData = LocationReviewService.getDocById(locationReviewId, {
      include: [
        {
          model: UserService.Model,
          attributes: ["id", "firebaseToken", "name"], // Added name for notification
        },
      ],
    });

    const reviewCommentData = super.create(data);
    const reviewerData = UserService.getDocById(userId);

    const [review, reviewComment, reviewer] = await Promise.all([
      reviewData,
      reviewCommentData,
      reviewerData,
    ]);

    // Firebase notification setup
    const notification = {
      title: `New comment on your review`,
      body: `${reviewer.username} just commented on your review`,
    };

    const tokenData = {
      notification,
      data: {
        type: "REVIEW_COMMENT",
        id: String(locationReviewId),
        userId: String(userId),
        reviewId: String(locationReviewId),
        commentId: String(reviewComment.id),
      },
    };

    const firebaseToken = review.User.firebaseToken;

    // Only notify if someone else commented on the review (not self-comment)
    if (Number(userId) !== review.userId) {
      // Create database notification record
      const notificationData = {
        actorId: userId,
        recipientId: review.userId,
        type: "REVIEW_COMMENT",
        status: "UNREAD",
        title: `${reviewer.username} commented on your review`,
        message: reviewComment.content
          ? `"${reviewComment.content.slice(0, 100)}${reviewComment.content.length > 100 ? "..." : ""}}"`
          : null,
        entityId: reviewComment.id,
        metadata: {
          id: locationReviewId,
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

    return reviewComment;
  }
  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true });
  }
}

export default LocationReviewCommentService;
