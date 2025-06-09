import Post from "#models/post";
import BaseService from "#services/base";

class PostService extends BaseService {
  static Model = Post;

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true });
  }
}

export default PostService;
