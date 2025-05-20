import User from "#models/user";
import httpStatus from "http-status";
import { compare } from "bcryptjs";
import AppError from "#utils/appError";
import BaseService from "#services/base";
import { createToken } from "#utils/jwt";
import { session } from "#middlewares/requestSession";

class UserService extends BaseService {
  static Model = User;

  static async login(userData) {
    const { email, password } = userData;

    const user = await this.getDoc({ email });
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
    };

    const token = createToken(payload);
    return { token };
  }

  static async update(id, data) {
    id = session.get("userId");
    return await super.update(id, data);
  }

  static async deleteDoc(id) {
    id = session.get("userId");
    return await super.deleteDoc(id);
  }
}

export default UserService;
