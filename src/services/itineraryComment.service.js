import BaseService from "#services/base";
import UserService from "#services/user";
import ItineraryService from "#services/itinerary";
import ItineraryComment from "#models/itineraryComment";
import NotificationService from "#services/notification";
import sendNewPostNotification from "#utils/notification";

class ItineraryCommentService extends BaseService {
  static Model = ItineraryComment;

  static async create(data) {
    const { itineraryId, userId } = data;
    const itineraryComment = await super.create(data);

    const [itinerary, commenter] = await Promise.all([
      ItineraryService.getDocById(itineraryId, {
        include: [
          {
            model: UserService.Model,
            attributes: ["id", "firebaseToken", "name"],
          },
        ],
      }),
      UserService.getDocById(userId),
    ]);

    if (Number(userId) !== itinerary.userId) {
      const notificationData = {
        actorId: userId,
        recipientId: itinerary.userId,
        type: "ITINERARY_COMMENT",
        status: "UNREAD",
        title: `${commenter.username} commented on your itinerary`,
        message: itineraryComment.content
          ? `"${itineraryComment.content.slice(0, 100)}${itineraryComment.content.length > 100 ? "..." : ""}}"`
          : itinerary.title || null,
        entityId: itineraryComment.id,
        metadata: {
          id: itineraryId,
        },
        scheduledFor: null,
        readAt: null,
        expiresAt: null,
      };

      await NotificationService.Model.create(notificationData);

      // Firebase notification
      if (itinerary.User.firebaseToken) {
        const tokenData = {
          notification: {
            title: `New comment on your itinerary`,
            body: `${commenter.username} just commented on your itinerary`,
          },
          data: {
            type: "ITINERARY_COMMENT",
            id: String(itineraryId),
            commentId: String(itineraryComment.id),
          },
        };

        sendNewPostNotification([itinerary.User.firebaseToken], tokenData)
          .then((result) => console.log(result))
          .catch((error) => console.log(error));
      }
    }

    return itineraryComment;
  }
}

export default ItineraryCommentService;
