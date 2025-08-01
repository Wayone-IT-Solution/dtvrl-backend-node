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

function generateRandomString(length = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

class UserController extends BaseController {
  static Service = UserService;

  static async get(req, res, next) {
    const { id } = req.params;

    if (!id) {
      return await super.get(req, res, next);
    }

    return this.getCurrentUser(req, res, next);
  }

  static async resetPass(req, res, next) {
    const { username } = req.body;
    const user = await this.Service.getDoc({ username });

    if (user.googleId) {
      throw new AppError({
        status: false,
        message:
          "This account is registered via google, please login using google",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const password = generateRandomString();
    user.password = await hash(password, 10);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Your DTVRL Password Has Been Updated",
      html: `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Password Updated</title>
  </head>
  <body style="margin:0; padding:0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
              <td align="center">
                  <table cellpadding="0" cellspacing="0" width="600" style="background-color: #fff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden;">
                      <!-- Header -->
                      <tr>
                          <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
                              <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 700;">
                                🔒 Password Updated
                              </h1>
                              <p style="color: #e2d7f5; margin: 10px 0 0; font-size: 16px; opacity: 0.9;">
                                Your DTVRL account security is our priority
                              </p>
                          </td>
                      </tr>

                      <!-- Greeting -->
                      <tr>
                          <td style="padding: 35px 40px 10px 40px;">
                              <h2 style="color: #333; font-weight: 600; margin: 0 0 20px 0; font-size: 22px;">
                                Hello ${user.name || "User"},
                              </h2>
                              <p style="color: #555; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
                                We wanted to let you know that your password for the <strong>DTVRL</strong> app has been successfully updated.
                              </p>

                              <p style="font-size: 16px; margin: 0 0 15px 0; color: #555;">
                                Your new password is:
                              </p>

                              <!-- Password Box -->
                              <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; width: fit-content; box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4); margin-bottom: 30px;">
                                  <span style="background-color: #fff; color: #333; font-family: 'Courier New', monospace; font-size: 24px; font-weight: 700; padding: 10px 25px; border-radius: 8px; letter-spacing: 2px; display: inline-block;">
                                      ${password}
                                  </span>
                              </div>

                              <p style="color: #555; font-size: 14px; line-height: 1.4; margin: 0 0 30px 0;">
                                If you did not request this change, please contact our support team immediately to secure your account.
                              </p>
                          </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                          <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e9ecef; text-align: center;">
                              <p style="color: #6c757d; font-size: 14px; margin: 0 0 15px 0;">
                                  Best regards,<br />
                                  <strong style="color: #495057;">The DTVRL Team</strong>
                              </p>
                              <div style="margin: 20px 0;">
                                  <a href="https://dtvrl.com" style="color: #667eea; text-decoration: none; font-size: 14px; margin: 0 15px;">
                                    🌐 Website
                                  </a>
                                  <a href="mailto:support@dtvrl.com" style="color: #667eea; text-decoration: none; font-size: 14px; margin: 0 15px;">
                                    📧 Support
                                  </a>
                                  <a href="tel:+91-XXXXXXXXXX" style="color: #667eea; text-decoration: none; font-size: 14px; margin: 0 15px;">
                                    📞 Contact
                                  </a>
                              </div>
                              <p style="color: #adb5bd; font-size: 12px; margin: 0; line-height: 1.5;">
                                  This is an automated message, please do not reply to this email.<br />
                                  &copy; ${new Date().getFullYear()} DTVRL. All rights reserved.
                              </p>
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>
      </table>
  </body>
  </html>
  `,
    });
    sendResponse(httpStatus.OK, res, null, "Password updated successfully");
  }

  static async create(req, res, next) {
    req.body.emailVerified = false;
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

    const mailOptions = generateOTPEmail({ otp, from: env.SMTP_USER }, user);
    const { success } = await sendEmail(mailOptions);

    if (!success) {
      throw new AppError({
        status: false,
        message: "Unable to send verification mail",
        httpStatus: httpStatus.INTERNAL_SERVER_ERROR,
      });
    }

    delete user.password;
    user.token = token;
    sendResponse(httpStatus.CREATED, res, user, "Signed up successfully");
  }

  static async resendOtp(req, res, next) {
    const payload = session.get("payload");
    let user = await this.Service.getDocById(payload.userId);

    if (user.emailVerified) {
      const newPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        emailVerified: true,
      };

      user = user.toJSON();

      delete user.password;

      const token = createToken(newPayload);
      user.token = token;
      return sendResponse(httpStatus.OK, res, user, "Otp sent successfully");
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    const newPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      emailVerified: false,
      otp: await hash(String(otp), 10),
    };

    user = user.toJSON();
    delete user.password;

    const mailOptions = generateOTPEmail({ otp, from: env.SMTP_USER }, user);
    const { success } = await sendEmail(mailOptions);

    if (!success) {
      throw new AppError({
        status: false,
        message: "Unable to send verification mail",
        httpStatus: httpStatus.INTERNAL_SERVER_ERROR,
      });
    }

    const token = createToken(newPayload);
    user.token = token;
    sendResponse(httpStatus.OK, res, user);
  }

  static async verifyMail(req, res, next) {
    const { otp: providedOTP } = req.body;
    const payload = session.get("payload");
    const { otp } = payload;

    const verification = await compare(String(providedOTP), otp);

    if (!verification) {
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
    };

    user = user.toJSON();

    delete user.password;

    const token = createToken(newPayload);
    user.token = token;
    sendResponse(httpStatus.OK, res, user);
  }

  static async login(req, res, next) {
    const tokenData = await this.Service.login(req.body);
    sendResponse(httpStatus.OK, res, tokenData, "Logged in successfully");
  }

  static async pingSession(req, res, next) {
    //TODO: Implement the ping functionality
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

    if (req.body.passwordUpdate) {
      req.body.password = await hash(req.body.password, 10);
    }

    const data = req.body.passwordUpdate
      ? await this.Service.updatePass(id, req.body)
      : await this.Service.update(id, req.body);
    sendResponse(httpStatus.OK, res, data, "User updated successfully");
  }

  static async deleteDoc(req, res, next) {
    const id = session.get("userId");
    await this.Service.deleteDoc(id);
    sendResponse(httpStatus.OK, res, null, "User deleted successfully");
  }
}

export default UserController;
