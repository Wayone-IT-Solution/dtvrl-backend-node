import Itinerary from "#models/itinerary";
import BaseService from "#services/base";

class ItineraryService extends BaseService {
  static Model = Itinerary;

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true });
  }
}

export default ItineraryService;
