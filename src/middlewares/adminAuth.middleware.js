import httpStatus from "http-status";
import AppError from "#utils/appError";

export default function adminAuth(req, res, next) {
  try {
    if (!req.user) {
      throw new AppError({
        status: false,
        message: "Unauthorized",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    if (req.user.isAdmin === true) {
      return next();
    }

    throw new AppError({
      status: false,
      message: "Admin access required",
      httpStatus: httpStatus.FORBIDDEN,
    });
  } catch (err) {
    next(err);
  }
}
