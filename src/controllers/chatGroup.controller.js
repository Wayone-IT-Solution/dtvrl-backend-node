import httpStatus from "http-status";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import ChatGroupService from "#services/chatGroup";
import { session } from "#middlewares/requestSession";

class ChatGroupController extends BaseController {
  static Service = ChatGroupService;

  static async create(req, res, next) {
    req.body.adminId = session.get("userId");
    const data = await this.Service.create(req.body);
    sendResponse(httpStatus.OK, res, data);
  }

  static async update(req, res, next) {
    const { id } = req.params;
    const adminId = session.get("userId");
    await this.Service.getDoc({ id, adminId });
    return await super.update(req, res, next);
  }

  static async deleteDoc(req, res, next) {
    const { id } = req.params;
    const doc = await this.Service.getDocById(id);
    await doc.destroy({ force: true });
    sendResponse(httpStatus.OK, res, null, "Chat group deleted successfully");
  }
}

export default ChatGroupController;
