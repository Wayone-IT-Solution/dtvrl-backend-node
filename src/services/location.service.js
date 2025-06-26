import Location from "#models/location";
import BaseService from "#services/base";

class LocationService extends BaseService {
  static Model = Location;

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true });
  }
}

export default LocationService;
