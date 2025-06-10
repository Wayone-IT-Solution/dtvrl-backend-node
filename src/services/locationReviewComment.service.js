import LocationReviewComment from "#models/locationReviewComment";
import BaseService from "#services/base";

class LocationReviewCommentService extends BaseService {
  static Model = LocationReviewComment;

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true });
  }
}

export default LocationReviewCommentService;
