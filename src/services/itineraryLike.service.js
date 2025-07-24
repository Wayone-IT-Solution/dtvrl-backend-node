import ItineraryLike from "#models/itineraryLike";
import BaseService from "#services/base";
import ItineraryService from "#services/itinerary";
import UserService from "#services/user";
import NotificationService from "#services/notification";
import sendNewPostNotification from "#utils/notification";

class ItineraryLikeService extends BaseService {
  static Model = ItineraryLike;

  static async create(data) {
    const { itineraryId, userId } = data;
    const itineraryLike = await super.create(data);

    const [itinerary, liker] = await Promise.all([
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
        type: "ITINERARY_LIKE",
        status: "UNREAD",
        title: `${liker.username} liked your itinerary`,
        message: itinerary.title || null,
        entityId: itineraryId,
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
            title: `New like on your itinerary`,
            body: `${liker.username} just liked your itinerary`,
          },
          data: {
            type: "ITINERARY_LIKE",
            id: String(itineraryId),
            likeId: String(itineraryLike.id),
          },
        };

        sendNewPostNotification([itinerary.User.firebaseToken], tokenData)
          .then((result) => console.log(result))
          .catch((error) => console.log(error));
      }
    }

    return itineraryLike;
  }
}

export default ItineraryLikeService;
