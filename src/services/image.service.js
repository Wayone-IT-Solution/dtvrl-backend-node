import Image from "#models/image";
import BaseService from "#services/base";
import { deleteFile } from "#configs/awsS3";

class ImageService extends BaseService {
  static Model = Image;

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    const { name } = doc;
    await doc.destroy({ force: true });
    await deleteFile(name);
  }
}

export default ImageService;
