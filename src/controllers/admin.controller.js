import httpStatus from "http-status";
import AdminService from "#services/admin";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import { session } from "#middlewares/requestSession";

class AdminController extends BaseController {
  static Service = AdminService;

  static async login(req, res, next) {
    const tokenData = await this.Service.login(req.body);
    sendResponse(httpStatus.OK, res, tokenData, "Logged in successfully");
  }

  static async getCurrentUser(req, res, next) {
    const adminId = session.get("userId");
    const loggedInUser = await this.Service.getDocById(adminId);
    sendResponse(httpStatus.OK, res, loggedInUser);
  }
}

export default AdminController;
