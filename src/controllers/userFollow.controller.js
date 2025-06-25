import User from "#models/user";
import httpStatus from "http-status";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import UserFollowService from "#services/userFollow";
import { session } from "#middlewares/requestSession";

class UserFollowController extends BaseController {
  static Service = UserFollowService;

  static async create(req, res, next) {
    req.body.userId = session.get("userId");
    return await super.create(req, res, next);
  }

  static async getFollowers(req, res, next) {
    const userId = session.get("userId");
    const { id } = req.params;

    req.query.otherId = userId;

    const { searchIn } = req.query;

    if (searchIn) {
      req.query.searchIn = "user.username";
    }

    const customOptions = {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "profile", "username"],
        },
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await this.Service.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }

  static async getFollowings(req, res, next) {
    const userId = session.get("userId");
    const { id } = req.params;

    req.query.userId = userId;

    const { searchIn } = req.query;

    if (searchIn) {
      req.query.searchIn = "otherUser.username";
    }

    const customOptions = {
      include: [
        {
          model: User,
          as: "otherUser",
          attributes: ["id", "name", "profile", "username"],
        },
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await this.Service.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }
}

export default UserFollowController;
