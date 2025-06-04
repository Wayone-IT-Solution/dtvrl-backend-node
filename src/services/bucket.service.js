import Bucket from "#models/bucket";
import BaseService from "#services/base";

class BucketService extends BaseService {
  static Model = Bucket;

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true });
  }
}

export default BucketService;
