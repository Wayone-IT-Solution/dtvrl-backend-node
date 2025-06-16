import httpStatus from "http-status";
import UserService from "#services/user";
import UserFollow from "#models/userFollow";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import { session } from "#middlewares/requestSession";
import AppError from "#utils/appError";
import { literal } from "sequelize";
import Memory from "#models/memory";
import LocationReview from "#models/locationReview";
import Itinerary from "#models/itinerary";

class UserController extends BaseController {
  static Service = UserService;

  static async get(req, res, next) {
    const { id } = req.params;

    if (!id) {
      return await super.get(req, res, next);
    }

    return this.getCurrentUser(req, res, next);
  }

  static async login(req, res, next) {
    const tokenData = await this.Service.login(req.body);
    sendResponse(httpStatus.OK, res, tokenData, "Logged in successfully");
  }

  static async getCurrentUser(req, res, next) {
    const userId = req.params.id ?? session.get("userId");
    const user = await this.Service.Model.findOne({
      where: { id: userId },
      attributes: {
        include: [
          // Follower count (other users who follow this user)
          [
            literal(`(
            SELECT COUNT(*)
            FROM "${UserFollow.tableName}" AS "followers"
            WHERE "followers"."otherId" = "User"."id"
          )`),
            "followerCount",
          ],
          // Following count (this user follows other users)
          [
            literal(`(
            SELECT COUNT(*)
            FROM "${UserFollow.tableName}" AS "followings"
            WHERE "followings"."userId" = "User"."id"
          )`),
            "followingCount",
          ],
          [
            literal(`(
            SELECT COUNT(*)
            FROM "${Memory.tableName}" AS "memories"
            WHERE "memories"."userId" = "User"."id"
          )`),
            "memoryCount",
          ],
          [
            literal(`(
    		SELECT COALESCE(SUM(DATE_PART('day', "endDate" - "startDate") + 1), 0)
    		FROM "${Memory.tableName}" AS "memories"
    		WHERE "memories"."userId" = "User"."id"
  			)`),
            "totalTravelDays",
          ],
          [
            literal(`(
    		SELECT COUNT(*)
    		FROM "${LocationReview.tableName}" AS "locationReviews"
    		WHERE "locationReviews"."userId" = "User"."id"
  			)`),
            "totalReviewCount",
          ],
          [
            literal(`(
    		SELECT COUNT(*)
    		FROM "${Itinerary.tableName}" AS "itineraries"
    		WHERE "itineraries"."userId" = "User"."id" AND "itineraries"."public" = true
  			)`),
            "totalItineraries",
          ],
        ],
      },
    });

    if (!user) {
      throw new AppError({
        status: false,
        message: "User not found",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }
    sendResponse(httpStatus.OK, res, user);
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
