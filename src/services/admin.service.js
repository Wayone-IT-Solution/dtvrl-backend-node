import Admin from "#models/admin";
import { compare } from "bcryptjs";
import httpStatus from "http-status";
import BaseService from "#services/base";
import { createToken } from "#utils/jwt";
import sequelize from "#configs/database";
import { session } from "#middlewares/requestSession";

class AdminService extends BaseService {
  static Model = Admin;

  static async create() {
    return;
  }

  static async deleteDoc() {
    return;
  }

  static async update(id, data) {
    delete data.password;
    return await super.update(id, data);
  }

  static async login(userData) {
    const { email, password } = userData;

    let user = await this.getDoc({ email });
    const verification = await compare(password, user.password);

    if (!verification) {
      throw new AppError({
        status: false,
        message: "Incorrect Password",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    user = user.toJSON();

    delete user.password;

    const payload = {
      userId: user.id,
      email: user.email,
      isAdmin: true,
    };

    const token = createToken(payload);
    return { token, user };
  }
}

session.run(async () => {
  session.set("transaction", await sequelize.transaction());

  const data = AdminService.Model.findAll().then((res) => {
    if (res.length) return;

    AdminService.Model.create({
      email: "johndoe@example.com",
      password: "password",
    }).then(async (done) => {
      await session.get("transaction").commit();
    });
  });
});

export default AdminService;
