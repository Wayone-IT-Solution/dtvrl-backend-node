import httpStatus from "http-status";
import MessageService from "#services/message";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import { session } from "#middlewares/requestSession";
import NotificationService from "#services/notification";

class NotificationController extends BaseController {
  static Service = NotificationService;

  static async get(req, res, next) {
    const payload = session.get("payload");
    req.query.recipientId = payload.userId;
    return await super.get(req, res, next);
  }

  static async getPendingNotification(req, res, next) {
    const payload = session.get("payload");
    const [notificationCount, messageCount] = await Promise.all([
      this.Service.Model.count({
        where: {
          recipientId: payload.userId,
          status: "UNREAD",
        },
      }),
      MessageService.Model.count({
        where: {
          receiverId: payload.userId,
          readByUser: false,
        },
      }),
    ]);

    sendResponse(httpStatus.OK, res, { notificationCount, messageCount });
  }

  static async readAllNotifications(req, res, next) {
    const payload = session.get("payload");

    await this.Service.Model.update(
      {
        status: "READ",
        readAt: new Date(),
      },
      {
        where: {
          recipientId: payload.userId,
          status: "UNREAD",
        },
      },
    );

    sendResponse(httpStatus.OK, res, null);
  }
}

export default NotificationController;
