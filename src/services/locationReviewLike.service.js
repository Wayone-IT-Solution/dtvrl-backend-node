import UserService from "#services/user";
import BaseService from "#services/base";
import NotificationService from "#services/notification";
import sendNewPostNotification from "#utils/notification";
import LocationReviewLike from "#models/locationReviewLike";
import LocationReviewService from "#services/locationReview";

class LocationReviewLikeService extends BaseService {
  static Model = LocationReviewLike;

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

    const reviewLikeData = super.create(data);
    const reviewerData = UserService.getDocById(userId);

    const [review, reviewLike, reviewer] = await Promise.all([
      reviewData,
      reviewLikeData,
      reviewerData,
    ]);

    // Firebase notification setup
    const notification = {
      title: `New like on your review`,
      body: `${reviewer.username} just liked your review`,
    };

    const tokenData = {
      notification,
      data: {
        type: "REVIEW_LIKE",
        id: String(locationReviewId),
      },
    };

    const firebaseToken = review.User.firebaseToken;

    // Only notify if someone else liked the review (not self-like)
    if (Number(userId) !== review.userId) {
      // Create database notification record
      const notificationData = {
        actorId: userId,
        recipientId: review.userId,
        type: "REVIEW_LIKE",
        status: "UNREAD",
        title: `${reviewer.username} liked your review`,
        message: review.content
          ? `"${review.content.slice(0, 50)}${review.content.length > 50 ? "..." : ""}}"`
          : null,
        entityId: locationReviewId,
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

    return reviewLike;
  }
}

export default LocationReviewLikeService;
