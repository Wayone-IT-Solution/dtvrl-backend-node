import Stamp from "#models/stamp";
import BaseService from "#services/base";

class StampService extends BaseService {
  static Model = Stamp;

  static async deleteDoc(id) {
    const doc = await StampService.getDocById(id);
    await doc.destroy({ force: true });
    return null;
  }
}

export default StampService;
