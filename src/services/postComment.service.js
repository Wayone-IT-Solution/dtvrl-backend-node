import PostService from "#services/post";
import BaseService from "#services/base";
import PostComment from "#models/postComment";
import NotificationService from "#services/notification";
import { session } from "#middlewares/requestSession";

class PostCommentService extends BaseService {
  static Model = PostComment;

  static async create(data) {
    const comment = await super.create(data);
    return comment;
  }

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true });
  }
}

export default PostCommentService;
