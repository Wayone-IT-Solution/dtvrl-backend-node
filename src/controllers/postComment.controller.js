import BaseController from "#controllers/base";
import PostCommentService from "#services/postComment";

class PostCommentController extends BaseController {
  static Service = PostCommentService;
}

export default PostCommentController;
