import PostService from "#services/post";
import BaseService from "#services/base";
import PostComment from "#models/postComment";
import NotificationService from "#services/notification";

class PostCommentService extends BaseService {
  static Model = PostComment;

  static async create(data) {
    const comment = await super.create(data);
    const post = await PostService.getDocById(data.postId);
    await NotificationService.create({
      notification: `${session.user.name} just commented on your post`,
      userId: post.userId,
    });
    return comment;
  }

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true });
  }
}

export default PostCommentService;
