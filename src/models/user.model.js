import { hash } from "bcryptjs";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class User extends BaseModel {
  static genderEnumArr = ["Male", "Female", "Other"];
}

User.initialize(
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-zA-Z0-9_.-]*$/, // Alphanumeric + underscore/dash/period
        len: [3, 50],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phoneCountryCode: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "+91",
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: /^[0-9+\- ]{7,15}$/, // basic phone validation
      },
    },
    gender: {
      type: DataTypes.ENUM(User.genderEnumArr),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 100],
      },
    },
    referredBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "token",
    },
    profile: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dob: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: new Date(),
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

export default User;
