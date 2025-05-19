import Message from "#models/message";
import BaseService from "#services/base";

class MessageService extends BaseService {
  static Model = Message;
}

export default MessageService;
