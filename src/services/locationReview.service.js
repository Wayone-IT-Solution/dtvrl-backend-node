import BaseService from "#services/base";
import LocationReview from "#models/locationReview";
import { session } from "#middlewares/requestSession";

class LocationReviewService extends BaseService {
  static Model = LocationReview;

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true, transaction: session.get("transaction") });
  }
}

export default LocationReviewService;
