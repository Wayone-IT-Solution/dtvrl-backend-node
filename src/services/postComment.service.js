import PostComment from "#models/postComment";
import BaseService from "#services/base";

class PostCommentService extends BaseService {
  static Model = PostComment;
}

export default PostCommentService;
