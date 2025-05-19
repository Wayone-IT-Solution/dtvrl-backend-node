import NotificationService from "#services/notification";
import BaseController from "#controllers/base";

class NotificationController extends BaseController {
  static Service = NotificationService;
}

export default NotificationController;
