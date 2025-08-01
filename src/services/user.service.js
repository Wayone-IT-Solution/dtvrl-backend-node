import User from "#models/user";
import { hash, compare } from "bcryptjs";
import httpStatus from "http-status";
import AppError from "#utils/appError";
import BaseService from "#services/base";
import { createToken } from "#utils/jwt";
import { sendEmail } from "#configs/nodeMailer";
import { generateOTPEmail } from "#templates/emailTemplate";
import env from "#configs/env";

class UserService extends BaseService {
  static Model = User;

  static async login(userData) {
    const { email: username, password } = userData;

    let user = await this.getDoc({ username });
    const verification = await compare(password, user.password);

    if (!verification) {
      throw new AppError({
        status: false,
        message: "Incorrect Password",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      emailVerified: true,
    };

    if (!user.emailVerified) {
      payload.emailVerified = false;

      const otp = Math.floor(100000 + Math.random() * 900000);
      payload.otp = await hash(String(otp), 10);
      const token = createToken(payload);

      const mailOptions = generateOTPEmail({ otp, from: env.SMTP_USER }, user);
      const { success } = await sendEmail(mailOptions);

      if (!success) {
        throw new AppError({
          status: false,
          message: "Unable to send email",
          httpStatus: httpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      throw new AppError({
        status: false,
        message: "Please verify your email",
        httpStatus: httpStatus.UNAUTHORIZED,
        data: {
          emailVerified: false,
          token,
        },
      });
    }

    const token = createToken(payload);

    user = user.toJSON();

    delete user.password;
    user.token = token;

    return user;
  }

  static async update(id, data) {
    delete data.password;
    return await super.update(id, data);
  }

  static async updatePass(id, data) {
    return await super.update(id, data);
  }

  static async deleteDoc(id) {
    const doc = await this.getDocById(id);
    await doc.destroy({ force: true });
  }
}

export default UserService;
