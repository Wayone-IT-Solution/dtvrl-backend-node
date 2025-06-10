import httpStatus from "http-status";
import AdminService from "#services/admin";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import { session } from "#middlewares/requestSession";
import UserService from "#services/user";
import PostService from "#services/post";

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

  static async getUsers(req, res, next) {
    const { id } = req.params;
    const options = this.Service.getOptions(req.query, {});
    const users = await UserService.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, users, "Users fetched successfully");
  }

  static async getPosts(req, res, next) {
    const { id } = req.params;
    const options = this.Service.getOptions(req.query, {});
    const posts = await PostService.get(id, req.query, options);
  }
}

export default AdminController;
