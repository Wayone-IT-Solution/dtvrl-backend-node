import ChatGroupMessageService from "#services/chatGroupMessage";
import BaseController from "#controllers/base";

class ChatGroupMessageController extends BaseController {
  static Service = ChatGroupMessageService;
}

export default ChatGroupMessageController;
