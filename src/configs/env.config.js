import { configDotenv } from "dotenv";
import { cleanEnv, str, num, bool } from "envalid";

configDotenv();

const env = cleanEnv(process.env, {
  PORT: num({ default: 3000 }),
  JWT_SECRET: str({ default: "jwtsecret" }),
  DB_NAME: str(),
  DB_USER: str(),
  DB_PASS: str(),
  DB_HOST: str(),
  DB_DIALECT: str(),
  AWS_S3_ENABLED: bool({ default: true }),
  AWS_S3_REGION: str(),
  AWS_S3_BUCKET: str(),
  AWS_S3_ACCESS_KEY_ID: str(),
  AWS_S3_SECRET_ACCESS_KEY: str(),
  AWS_S3_BASE_URL: str(),
  NODE_ENV: str({ default: "Development" }),
  OLA_API_KEY: str(),
  GOOGLE_CLIENT_ID: str(),
  GOOGLE_CLIENT_SECRET: str(),
  GOOGLE_MOBILE_CLIENT_ID: str(),
  OPENAI_API_KEY: str(),

  // SMTP Email Configuration
  SMTP_HOST: str(),
  SMTP_PORT: num({ default: 587 }),
  SMTP_SECURE: bool({ default: true }),
  SMTP_USER: str(),
  SMTP_PASS: str(),

  // Apple Sign-in
  APPLE_SERVICE_ID: str(), // com.dtvrl.diary.api
  APPLE_TEAM_ID: str(), // Your Apple Developer Team ID
  APPLE_KEY_ID: str(), // From your Apple Key
  APPLE_KEY_PATH: str(), // Path to AuthKey_KEYID.p8
  DOMAIN: str(), // e.g. https://api.dtvrl.com
  AI_CHAT_MAX_STORED_MESSAGES: num({ default: 40 }),
  AI_CHAT_MAX_FETCHED_MESSAGES: num({ default: 40 }),
});

export default env;
