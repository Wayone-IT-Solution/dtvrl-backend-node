import ChatGroupService from "#services/chatGroup";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
class ChatGroupController extends BaseController {
  static Service = ChatGroupService;

  static async create(req, res) {
    try {
      req.body.adminId = session.get("userId");
      const chatGroup = await this.Service.create(req.body);
      res.status(201).json(chatGroup);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default ChatGroupController;
