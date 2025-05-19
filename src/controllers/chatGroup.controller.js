import ChatGroupService from "#services/chatGroup";
import BaseController from "#controllers/base";

class ChatGroupController extends BaseController {
  static Service = ChatGroupService;
}

export default ChatGroupController;
