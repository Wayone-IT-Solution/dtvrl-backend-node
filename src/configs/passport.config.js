import env from "#configs/env";
import User from "#models/user";
import { hash } from "bcryptjs";
import passport from "passport";
import { v4 as uuidv4 } from "uuid";
import httpStatus from "http-status";
import AppError from "#utils/appError";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const generateRandomUsername = (name) =>
  name.toLowerCase().replace(/\s+/g, "_") +
  "_" +
  Math.floor(Math.random() * 10000);

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/api/user/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(
            new AppError({
              status: false,
              message: "Please allow email permission",
              httpStatus: httpStatus.BAD_REQUEST,
            }),
            null,
          );
        }

        let user = await User.findOne({ where: { googleId: profile.id } });

        if (!user) {
          const dummyPassword = await hash(uuidv4(), 10);

          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email,
            username: generateRandomUsername(profile.displayName),
            phoneCountryCode: "+91",
            phone: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            gender: "Other",
            password: dummyPassword,
            referredBy: null,
            isPrivate: false,
            refreshToken: uuidv4(),
            profile: profile.photos?.[0]?.value || "user-profile.png",
            dob: new Date("2000-01-01"),
            isGoogleUser: true, // optional
            isProfileComplete: false, // optional
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);
