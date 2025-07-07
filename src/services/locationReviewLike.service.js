import UserService from "#services/user";
import BaseService from "#services/base";
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
          attributes: ["id"],
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

    const notification = {
      title: `New like on your review`,
      body: `${reviewer.name} just liked your review`,
    };

    const tokenData = {
      notification,
      data: {
        type: "new_like",
      },
    };

    const firebaseToken = review.User.firebaseToken;

    if (Number(userId) !== review.userId) {
      sendNewPostNotification([firebaseToken], tokenData)
        .then((ele) => {
          console.log(ele);
        })
        .catch((e) => {
          console.log(e);
        });
    }

    return reviewLike;
  }
}

export default LocationReviewLikeService;
