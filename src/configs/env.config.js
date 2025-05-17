import { configDotenv } from "dotenv";
import { cleanEnv, str, num } from "envalid";

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
});

export default env;
