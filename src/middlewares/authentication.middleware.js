import httpStatus from "http-status";
import AppError from "#utils/appError";
import { verifyToken } from "#utils/jwt";
import { session } from "#middlewares/requestSession";

export async function authentication(req, res, next) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      throw new AppError({
        status: false,
        message: "Please login",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    token = token.split(" ")[1];

    const payload = verifyToken({ token });

    session.set("userType", payload.userType);
    session.set("payload", payload);

    next();
  } catch (err) {
    next(err);
  }
}
