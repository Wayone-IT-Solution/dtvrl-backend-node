import httpStatus from "http-status";
import UserService from "#services/user";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";

class UserController extends BaseController {
  static Service = UserService;

  static async login(req, res, next) {
    const tokenData = await this.Service.login(req.body);
    sendResponse(httpStatus.OK, res, tokenData, "Logged in successfully");
  }

  static async getCurrentUser(req, res, next) {
    const userId = session.get("userId");
    const loggedInUser = await this.Service.getDocById(userId);
    sendResponse(httpStatus.OK, res, loggedInUser);
  }

  static async update(req, res, next) {
    const id = session.get("userId");
    const data = await this.Service.update(id, req.body);
    sendResponse(httpStatus.OK, res, data, "User updated successfully");
  }

  static async deleteDoc(req, res, next) {
    const id = session.get("userId");
    await this.Service.deleteDoc(id);
    sendResponse(httpStatus.OK, res, null, "User deleted successfully");
  }
}

export default UserController;
