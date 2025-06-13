import Memory from "#models/memory";
import BaseService from "#services/base";
import ImageService from "#services/image";
import { deleteFile } from "#configs/awsS3";
import { session } from "#middlewares/requestSession";

class MemoryService extends BaseService {
  static Model = Memory;

  static async deleteDoc(id) {
    const memory = await this.Model.findDocById(id);
    const images = await ImageService.Model.findAll({
      where: { memoryId: id },
    });
    const keys = [];

    const imagesMap = images.map((ele) => {
      ele.destroy({ force: true, transaction: session.get("transaction") });
      keys.push(ele.name);
    });

    imagesMap.push(
      memory.destroy({ force: true, transaction: session.get("transaction") }),
    );

    await Promise.all(imagesMap);

    const deletedImages = keys.map((ele) => {
      return deleteFile(ele);
    });

    await Promise.all(deletedImages);
  }
}

export default MemoryService;
