import jwt from "jsonwebtoken";
import env from "#configs/env";
import { Op } from "sequelize";
import User from "#models/user";
import { fileTypeFromBuffer } from "file-type";
import { hash } from "bcryptjs";
import { email } from "envalid";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import httpStatus from "http-status";
import AppError from "#utils/appError";
import { sendResponse } from "#utils/response";
import { OAuth2Client } from "google-auth-library";
import { session } from "#middlewares/requestSession";

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

  let user = await User.findOne({
    where: {
      [Op.or]: [{ googleId: payload.sub }, { email: payload.email }],
    },
  });

  if (!user) {
    const dummyPassword = await hash(uuidv4(), 10);

    if (payload.picture) {
      async function fetchImageAsMulterObject(imageUrl, fieldname = "file") {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer",
        });
        const buffer = Buffer.from(response.data);

        const type = await fileTypeFromBuffer(buffer);
        if (!type) throw new Error("Unable to determine file type");

        const originalname = `profile.${type.ext}`;

        return {
          fieldname,
          originalname,
          mimetype: type.mime,
          buffer,
        };
      }

      const fileArr = [
        await fetchImageAsMulterObject(payload.picture, "profile"),
      ];

      session.set("files", fileArr);
    }

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
      dob: new Date("2000-01-01"),
      isGoogleUser: true,
      isProfileComplete: false,
      emailVerified: true,
    });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
  user = user.toJSON();

  delete user.password;
  user.token = token;

  sendResponse(httpStatus.OK, res, user);
};
