import httpStatus from "http-status";
import MessageService from "#services/message";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import AppError from "#utils/appError";

class MessageController extends BaseController {
  static Service = MessageService;

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
          page: parseInt(page),
          limit: parseInt(limit),
        }
      );

      sendResponse(
        httpStatus.OK,
        res,
        messagesData.data,
        "Messages fetched successfully"
      );
    } catch (err) {
      next(err);
    }
  }


}

export default MessageController;
