import jwt from "jsonwebtoken";
import env from "#configs/env";
import User from "#models/user";
import { hash } from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import httpStatus from "http-status";
import { sendResponse } from "#utils/response";
import AppError from "#utils/appError";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const generateRandomUsername = (name) =>
  name.toLowerCase().replace(/\s+/g, "_") +
  "_" +
  Math.floor(Math.random() * 10000);

export const googleMobileAuth = async (req, res, next) => {
  const { idToken } = req.body;

  if (!idToken) {
    return next(
      new AppError({
        status: false,
        message: "idToken is required",
        httpStatus: httpStatus.BAD_REQUEST,
      }),
    );
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return next(
        new AppError({
          status: false,
          message: "Please allow email permission",
          httpStatus: httpStatus.BAD_REQUEST,
        }),
      );
    }

    let user = await User.findOne({ where: { googleId: payload.sub } });

    if (!user) {
      const dummyPassword = await hash(uuidv4(), 10);

      user = await User.create({
        googleId: payload.sub,
        name: payload.name,
        email: payload.email,
        username: generateRandomUsername(payload.name),
        phoneCountryCode: "+91",
        phone: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        gender: "Other",
        password: dummyPassword,
        referredBy: null,
        isPrivate: false,
        refreshToken: uuidv4(),
        profile: payload.picture || "user-profile.png",
        dob: new Date("2000-01-01"),
        isGoogleUser: true,
        isProfileComplete: false,
      });
    }

    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email, name: req.user.name },
      env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );
    user = user.toJSON();

    delete user.password;
    user.token = token;

    sendResponse(httpStatus.OK, res, user);
  } catch (err) {
    console.error("Google ID token verification failed:", err);
    next(
      new AppError({
        status: false,
        message: "Invalid or expired Google token",
        httpStatus: httpStatus.UNAUTHORIZED,
      }),
    );
  }
};
