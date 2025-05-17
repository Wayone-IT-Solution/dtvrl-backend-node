import jwt from "jsonwebtoken";
import env from "#configs/env";
import AppError from "#utils/appError";
import httpStatus from "http-status";

export function verifyToken(data) {
  try {
    const { token, secret } = data;
    const payload = jwt.verify(token, secret ?? env.JWT_SECRET);
    return payload;
  } catch (err) {
    throw new AppError({
      status: false,
      message: err.message,
      httpStatus: httpStatus.UNAUTHORIZED,
    });
  }
}

export function createToken(payload, options = {}) {
  try {
    const { secret } = options;
    delete options.secret;
    const token = jwt.sign(payload, secret ?? env.JWT_SECRET, options);
    return token;
  } catch (err) {
    throw new AppError({
      status: false,
      message: err.message,
      httpStatus: httpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}
