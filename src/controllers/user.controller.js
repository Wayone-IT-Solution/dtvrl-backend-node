import env from "#configs/env";
import { literal } from "sequelize";
import Memory from "#models/memory";
import httpStatus from "http-status";
import AppError from "#utils/appError";
import UserService from "#services/user";
import { createToken } from "#utils/jwt";
import { compare, hash } from "bcryptjs";
import Itinerary from "#models/itinerary";
import UserFollow from "#models/userFollow";
import BaseController from "#controllers/base";
import { sendResponse } from "#utils/response";
import { sendEmail } from "#configs/nodeMailer";
import LocationReview from "#models/locationReview";
import { session } from "#middlewares/requestSession";
import { generateOTPEmail } from "#templates/emailTemplate";

class UserController extends BaseController {
  static Service = UserService;

  static async get(req, res, next) {
    const { id } = req.params;

    if (!id) {
      return await super.get(req, res, next);
    }

    return this.getCurrentUser(req, res, next);
  }

  static async create(req, res, next) {
    let user = await this.Service.create(req.body);

    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      emailVerified: false,
    };

    const otp = Math.floor(100000 + Math.random() * 900000);
    payload.otp = await hash(String(otp), 10);

    const token = createToken(payload);

    user = user.toJSON();

    console.log(env);

    const mailOptions = generateOTPEmail({ otp, from: env.SMTP_USER }, user);
    const { success } = await sendEmail(mailOptions);

    if (!success) {
      throw new AppError({
        status: false,
        message: "Mail sent successfully",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    delete user.password;
    user.token = token;
    sendResponse(httpStatus.CREATED, res, user, "Signed up successfully");
  }

  static async verifyMail(req, res, next) {
    const { otp: providedOTP } = req.body;
    const payload = session.get("payload");
    const { otp } = payload;

    const verification = await compare(String(providedOTP), otp);

    if (verification) {
      throw new AppError({
        status: false,
        message: "Incorrect OTP",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    let user = await this.Service.getDocById(payload.userId);
    user.emailVerified = true;
    await user.save();

    const newPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      emailVerified: true,
      otp: Math.floor(100000 + Math.random() * 900000),
    };

    user = user.toJSON();

    delete user.password;
    user.token = token;

    const token = createToken(newPayload);
    sendResponse(httpStatus.OK, res, user);
  }

  static async login(req, res, next) {
    const tokenData = await this.Service.login(req.body);
    sendResponse(httpStatus.OK, res, tokenData, "Logged in successfully");
  }

  static async pingSession(req, res, next) {
    console.log("PING recieved from user", session.get("payload"));
    sendResponse(httpStatus.OK, res, null);
  }

  static async getCurrentUser(req, res, next) {
    const userId = req.params.id ?? session.get("userId");
    let user = await this.Service.Model.findOne({
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
            "followersCount",
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

    user = user.toJSON();
    delete user.password;
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
