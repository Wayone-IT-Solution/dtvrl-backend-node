import BaseService from "#services/base";
import AiChatMessage from "#models/aiChatMessage";

class AiChatMessageService extends BaseService {
  static Model = AiChatMessage;
}

export default AiChatMessageService;
