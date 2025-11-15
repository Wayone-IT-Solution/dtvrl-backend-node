import httpStatus from "http-status";
import MessageService from "#services/message";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import AppError from "#utils/appError";
import AiChatMessageService from "#services/aiChatMessage";
import AiChatSession from "#models/aiChatSession";
import User from "#models/user";
import { session } from "#middlewares/requestSession";

const SESSION_MESSAGES_ALIAS =
  AiChatSession.associations?.AiChatMessages?.as ?? "AiChatMessages";

class MessageController extends BaseController {
  static Service = MessageService;

  static parsePagination(query = {}) {
    let page = Number(query.page) || 1;
    let limit = Number(query.limit) || 20;

    if (page < 1) page = 1;
    if (limit < 1) limit = 20;

    return { page, limit };
  }

  static async getChatList(req, res, next) {
    const { id } = req.params;
    const data = await this.Service.getChatList(id, req.query);
    sendResponse(httpStatus.OK, res, data);
  }

  /**
   * GET messages between two users (latest on top, paginated)
   * @route GET /messages/conversation?userId1=1&userId2=2&page=1&limit=20
   */
  static async getMessagesBetweenUsers(req, res, next) {
    try {
      const { userId1, userId2, page = 1, limit = 20 } = req.query;

      if (!userId1 || !userId2) {
        throw new AppError({
          status: false,
          message: "Both userId1 and userId2 are required",
          httpStatus: httpStatus.BAD_REQUEST,
        });
      }

      const messagesData = await MessageService.getMessagesBetweenUsers(
        parseInt(userId1),
        parseInt(userId2),
        {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
        },
      );

      sendResponse(
        httpStatus.OK,
        res,
        messagesData.data,
        "Messages fetched successfully",
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAiMessagesForUser(req, res) {
    const payload = session.get("payload");
    const sessionUserId = session.get("userId");
    const isAdmin = Boolean(payload?.isAdmin);
    const { userId } = req.params;
    const parsedUserId = Number(userId);
    if (!parsedUserId) {
      throw new AppError({
        status: false,
        message: "Valid userId param is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    if (!isAdmin && (!sessionUserId || Number(sessionUserId) !== parsedUserId)) {
      throw new AppError({
        status: false,
        message: "Only admins can access other users' AI chat messages",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    const { page, limit } = this.parsePagination(req.query);
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    const { rows, count } = await AiChatSession.findAndCountAll({
      where: { userId: parsedUserId },
      include: [
        {
          model: User,
          attributes: ["id", "name", "username", "email", "profile"],
        },
        {
          model: AiChatMessageService.Model,
          as: SESSION_MESSAGES_ALIAS,
          attributes: ["id", "role", "content", "metadata", "createdAt"],
          separate: true,
          order: [["createdAt", "ASC"]],
        },
      ],
      order: [["lastInteractionAt", "DESC"]],
      limit: limitNum,
      offset,
      distinct: true,
    });

    const result = rows.map((sessionRow) => {
      const json = sessionRow.toJSON();
      json.messages = json[SESSION_MESSAGES_ALIAS] || [];
      delete json[SESSION_MESSAGES_ALIAS];
      return json;
    });

    sendResponse(
      httpStatus.OK,
      res,
      {
        result,
        pagination: {
          totalItems: count,
          totalPages:
            limitNum === 0 ? 0 : Math.max(1, Math.ceil(count / limitNum)),
          currentPage: pageNum,
          itemsPerPage: limitNum,
        },
      },
      "AI chat messages fetched successfully",
    );
  }
}

export default MessageController;
