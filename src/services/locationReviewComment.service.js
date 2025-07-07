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
          attributes: ["id", "firebaseToken"],
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

    const notification = {
      title: `New comment on your review`,
      body: `${reviewer.name} just commented on your review`,
    };

    const tokenData = {
      notification,
      data: {
        type: "new_comment",
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

    return reviewComment;
  }

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true });
  }
}

export default LocationReviewCommentService;
