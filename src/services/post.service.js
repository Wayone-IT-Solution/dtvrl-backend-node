import Post from "#models/post";
import BaseService from "#services/base";

class PostService extends BaseService {
  static Model = Post;
}

export default PostService;
