import PostLike from "#models/postLike";
import BaseService from "#services/base";
import PostService from "#services/post";

class PostLikeService extends BaseService {
  static Model = PostLike;

  static async create(data) {
    const { postId } = data;
    const post = await PostService.getDocById(postId);
    await super.create(data);

    post.likes += 1;

    await post.save();
    return post;
  }

  // FIX: like updation has to be fixed
  static async deleteDoc(userId) {}
}

export default PostLikeService;
