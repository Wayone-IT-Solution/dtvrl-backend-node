import httpStatus from "http-status";
import UserService from "#services/user";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import UserSessionService from "#services/userSession";

class UserSessionController extends BaseController {
  static Service = UserSessionService;

  static async get(req, res, next) {
    const { id } = req.params;
    const customOptions = {
      include: [
        {
          model: UserService.Model,
          attributes: ["id", "name"],
        },
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = id
      ? await this.Service.getDocById(id, customOptions)
      : await this.Service.get(null, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }
}

export default UserSessionController;
