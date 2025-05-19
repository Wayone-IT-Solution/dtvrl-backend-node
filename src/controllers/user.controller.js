import httpStatus from "http-status";
import UserService from "#services/user";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";

class UserController extends BaseController {
  static Service = UserService;

  static async login(req, res, next) {
    const tokenData = await this.Service.login(req.body);
    sendResponse(httpStatus.OK, res, tokenData, "Logged in successfully");
  }
}

export default UserController;
