import User from "#models/user";
import httpStatus from "http-status";
import AppError from "#utils/appError";
import ChatGroup from "#models/chatGroup";
import { sendResponse } from "#utils/response";
import BaseController from "#controllers/base";
import ChatGroupService from "#services/chatGroup";
import { session } from "#middlewares/requestSession";
import ChatGroupMessage from "#models/chatGroupMessage";
import ChatGroupMemberService from "#services/chatGroupMember";

class ChatGroupMemberController extends BaseController {
  static Service = ChatGroupMemberService;

  static async get(req, res, next) {
    const { id } = req.params;
    const customOptions = {
      include: [
        {
          model: User,
          attributes: ["id", "name", "profile", "username"],
        },
      ],
    };
    const options = this.Service.getOptions(req.query, customOptions);
    const data = await this.Service.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }

  static async create(req, res, next) {
    const userId = session.get("userId");
    const { groupId } = req.body;

    const { adminId } = await ChatGroupService.getDocById(groupId);
    if (adminId !== userId) {
      throw new AppError({
        status: false,
        message: "Only admin can add new members",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    await super.create(req, res, next);
  }

  static async getGroupList(req, res, next) {
    req.query.userId = session.get("userId");
    const { id } = req.params;
    const customOptions = {
      include: [
        {
          model: ChatGroup,
          attributes: ["id", "name", "profile", "bio"],
          include: [
            {
              model: User,
              as: "Admin",
              attributes: ["id"],
            },
            {
              model: ChatGroupMessage,
              attributes: ["id", "text", "senderId"],
              limit: 1,
              separate: true,
              order: [["createdAt", "DESC"]],
              include: [
                {
                  model: User,
                  attributes: ["id", "name", "profile"],
                },
              ],
            },
          ],
        },
      ],
    };
    const options = this.Service.getOptions(req.query, customOptions);
    const data = await this.Service.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }

  static async deleteDoc(req, res, next) {
    const userId = session.get("userId");
    const { id: groupId } = req.params;
    const groupMember = await ChatGroupMemberService.getDocById({
      groupId,
      userId,
    });
    await groupMember.destroy({ force: true });
    sendResponse(httpStatus.OK, res, null, "Group exited successfully");
  }
}

export default ChatGroupMemberController;
