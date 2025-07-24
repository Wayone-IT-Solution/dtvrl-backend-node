import "#configs/passport";
import express from "express";
import env from "#configs/env";
import jwt from "jsonwebtoken";
import passport from "passport";
import sequelize from "#configs/database";
import { sendResponse } from "#utils/response";
import UserController from "#controllers/user";
import asyncHandler from "#utils/asyncHandler";
import { session } from "#middlewares/requestSession";
import { googleMobileAuth } from "#configs/googleLogin";
import { authentication, signupCheck } from "#middlewares/authentication";

const router = express.Router();

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.post("/auth/google/mobile", asyncHandler(googleMobileAuth));

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res) => {
    session.set("transaction", await sequelize.transaction());
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email, name: req.user.name },
      env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    const user = req.user;
    user = user.toJSON();

    delete user.password;
    user.token = token;

    sendResponse(httpStatus.OK, res, user);
  },
);

router
  .route("/login")
  .post(asyncHandler(UserController.login.bind(UserController)));

router
  .route("/verify")
  .post(
    signupCheck,
    asyncHandler(UserController.verifyMail.bind(UserController)),
  );

router
  .route("/resend-otp")
  .get(
    signupCheck,
    asyncHandler(UserController.resendOtp.bind(UserController)),
  );

router
  .route("/")
  .post(asyncHandler(UserController.create.bind(UserController)));

router
  .route("/reset-pass")
  .post(asyncHandler(UserController.resetPass.bind(UserController)));

router.use(authentication);

router
  .route("/ping")
  .post(asyncHandler(UserController.pingSession.bind(UserController)));

router
  .route("/get-current-user")
  .get(asyncHandler(UserController.getCurrentUser.bind(UserController)));

router
  .route("/:id?")
  .get(asyncHandler(UserController.get.bind(UserController)))
  .put(asyncHandler(UserController.update.bind(UserController)))
  .delete(asyncHandler(UserController.deleteDoc.bind(UserController)));

export default router;
