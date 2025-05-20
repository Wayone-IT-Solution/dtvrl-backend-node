import { hash } from "bcryptjs";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class Admin extends BaseModel {}

Admin.initialize(
  {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    hooks: {
      async beforeCreate(instance) {
        instance.password = await hash(instance.password, 10);
      },
    },
  },
);

export default Admin;
