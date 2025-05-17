import { session } from "#middleware/requestSession";

export default function authorization(role) {
  return function (req, res, next) {
    try {
      const loggedInRole = session.get("role");

      if (loggedInRole === "admin") return next();

      if (role === "admin") {
      }

      if (adminId) {
        return next();
      }
    } catch (err) {
      next(err);
    }
  };
}
