import PostService from "#services/post";
import BaseController from "#controllers/base";

class PostController extends BaseController {
  static Service = PostService;
}

export default PostController;
