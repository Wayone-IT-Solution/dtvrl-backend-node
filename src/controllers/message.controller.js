import MessageService from "#services/message";
import BaseController from "#controllers/base";

class MessageController extends BaseController {
  static Service = MessageService;
}

export default MessageController;
