import PostShareService from "#services/postShare";
import BaseController from "#controllers/base";

class PostShareController extends BaseController {
  static Service = PostShareService;
}

export default PostShareController;
