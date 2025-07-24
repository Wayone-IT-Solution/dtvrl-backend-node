import NotificationService from "#services/notification";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";

class NotificationController extends BaseController {
  static Service = NotificationService;

  static async get(req, res, next) {
    const payload = session.get("payload");
    req.query.recipientId = payload.userId;
    return await super.get(req, res, next);
  }
}

export default NotificationController;
