import env from "#configs/env";
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASS, {
  host: env.DB_HOST,
  dialect: env.DB_DIALECT,
  logging: false,
  pool: { max: 20, min: 0, acquire: 60000, idle: 10000 },
  dialectOptions: { connectTimeout: 60000 },
});

export default sequelize;
