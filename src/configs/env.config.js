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
  AWS_S3_KEY: str(),
  AWS_S3_SECRET: str(),
  AWS_S3_REGION: str(),
  AWS_BUCKET_NAME: str(),
  AWS_S3_ENDPOINT: str(),
  NODE_ENV: str({ default: "Development" }),
  OLA_API_KEY: str(),
  GOOGLE_CLIENT_ID: str(),
  GOOGLE_CLIENT_SECRET: str(),
  GOOGLE_MOBILE_CLIENT_ID: str(),

  // SMTP Email Configuration
  SMTP_HOST: str(),
  SMTP_PORT: num({ default: 587 }),
  SMTP_SECURE: bool({ default: true }),
  SMTP_USER: str(),
  SMTP_PASS: str(),
});

export default env;
