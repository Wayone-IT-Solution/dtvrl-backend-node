import ItineraryRecommend from "#models/itineraryRecommend";
import BaseService from "#services/base";
import ItineraryService from "#services/itinerary";
import UserService from "#services/user";
import NotificationService from "#services/notification";
import sendNewPostNotification from "#utils/notification";

class ItineraryRecommendService extends BaseService {
  static Model = ItineraryRecommend;

  static async create(data) {
    const { itineraryId, userId } = data;
    const itineraryRecommend = await super.create(data);

    const [itinerary, recommender] = await Promise.all([
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
        type: "ITINERARY_RECOMMEND",
        status: "UNREAD",
        title: `${recommender.username} recommended your itinerary`,
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
            title: `New recommendation for your itinerary`,
            body: `${recommender.username} just recommended your itinerary`,
          },
          data: {
            type: "ITINERARY_RECOMMEND",
            id: String(itineraryId),
            recommendId: String(itineraryRecommend.id),
          },
        };

        sendNewPostNotification([itinerary.User.firebaseToken], tokenData)
          .then((result) => console.log(result))
          .catch((error) => console.log(error));
      }
    }

    return itineraryRecommend;
  }
}

export default ItineraryRecommendService;
