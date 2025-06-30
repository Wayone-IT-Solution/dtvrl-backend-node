import User from "#models/user";
import { compare } from "bcryptjs";
import httpStatus from "http-status";
import AppError from "#utils/appError";
import BaseService from "#services/base";
import { createToken } from "#utils/jwt";

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
    };

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

  static async deleteDoc(id) {
    const doc = await this.getDocById(id);
    await doc.destroy({ force: true });
  }
}

export default UserService;
