import fs from "fs";
import path from "path";
import passport from "passport";
import { hash } from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import AppleStrategy from "passport-apple";
import AppleAuth from "apple-auth";
import User from "#models/user";
import env from "#configs/env";
import AppError from "#utils/appError";
import httpStatus from "http-status";
import { dirname } from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const generateRandomUsername = (name) =>
  name.toLowerCase().replace(/\s+/g, "_") +
  "_" +
  Math.floor(Math.random() * 10000);

passport.use(
  new AppleStrategy(
    {
      clientID: env.APPLE_SERVICE_ID,
      teamID: env.APPLE_TEAM_ID,
      keyID: env.APPLE_KEY_ID,
      key: fs.readFileSync(path.join(__dirname, `../${env.APPLE_KEY_PATH}`)),
      callbackURL: `${env.DOMAIN}/api/user/auth/apple/callback`,
      scope: ["name", "email"],
      passReqToCallback: true, // IMPORTANT
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // The user's name and email are only sent in the req.body post
        // on the first authorization.
        const { user: appleUser } = req.body;
        const email = appleUser?.email || profile.email; // Fallback to profile email if available

        if (!email) {
          return done(
            new AppError({
              message: "Email permission is required from Apple.",
              httpStatus: httpStatus.BAD_REQUEST,
            }),
            null,
          );
        }

        let user = await User.findOne({ where: { appleId: profile.id } });

        if (!user) {
          const dummyPassword = await hash(uuidv4(), 10);
          const name = appleUser?.name
            ? `${appleUser.name.firstName} ${appleUser.name.lastName}`
            : "User";

          user = await User.create({
            appleId: profile.id, // Add appleId to your User model
            name: name,
            email: email,
            username: generateRandomUsername(name),
            phoneCountryCode: "+91",
            phone: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            gender: "Other",
            password: dummyPassword,
            refreshToken: uuidv4(),
            dob: new Date("2000-01-01"),
            emailVerified: true, // Apple emails are considered verified
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

export const appleMobileAuth = async (req, res, next) => {
  const { idToken, name } = req.body;
  if (!idToken) {
    return next(
      new AppError({
        message: "idToken is required",
        httpStatus: httpStatus.BAD_REQUEST,
      }),
    );
  }

  try {
    const appleAuthConfig = {
      client_id: env.APPLE_APP_ID, // This is your App ID, not Service ID
      team_id: env.APPLE_TEAM_ID,
      key_id: env.APPLE_KEY_ID,
      redirect_uri: "http://localhost:3000", // Doesn't matter for this flow
    };
    const auth = new AppleAuth(
      appleAuthConfig,
      fs.readFileSync(path.join(__dirname, `../${env.APPLE_KEY_PATH}`)),
      "text",
    );

    const tokenData = await auth.accessToken(idToken);
    const idTokenClaims = jwt.decode(tokenData.id_token);

    if (!idTokenClaims?.email) {
      return next(
        new AppError({
          message: "Email permission is required.",
          httpStatus: httpStatus.BAD_REQUEST,
        }),
      );
    }

    let user = await User.findOne({ where: { appleId: idTokenClaims.sub } });

    if (!user) {
      const dummyPassword = await hash(uuidv4(), 10);
      const displayName = name || idTokenClaims.email.split("@")[0];

      user = await User.create({
        appleId: idTokenClaims.sub,
        name: displayName,
        email: idTokenClaims.email,
        username: generateRandomUsername(displayName),
        phoneCountryCode: "+91",
        phone: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        gender: "Other",
        password: dummyPassword,
        refreshToken: uuidv4(),
        dob: new Date("2000-01-01"),
        emailVerified: idTokenClaims.email_verified === "true",
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    user = user.toJSON();
    delete user.password;
    user.token = token;

    sendResponse(httpStatus.OK, res, user);
  } catch (error) {
    next(
      new AppError({
        message: "Invalid Apple token.",
        httpStatus: httpStatus.UNAUTHORIZED,
      }),
    );
  }
};
