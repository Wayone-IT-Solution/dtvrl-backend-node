import BaseController from "#controllers/base";
import PostLikeService from "#services/postLike";

class PostLikeController extends BaseController {
  static Service = PostLikeService;
}

export default PostLikeController;
