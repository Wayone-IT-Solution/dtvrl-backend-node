// src/models/user.model.js
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import { hash } from "bcryptjs";

class User extends BaseModel {
  static genderEnumArr = ["Male", "Female", "Other"];
  static statusEnumArr = ["active", "inactive", "blocked", "suspended", "pending"];
}

User.initialize(
  {
    name: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false },
    phoneCountryCode: { type: DataTypes.STRING, defaultValue: "+91" },
    phone: { type: DataTypes.STRING, allowNull: false },
    gender: { type: DataTypes.ENUM(User.genderEnumArr), allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    referredBy: { type: DataTypes.INTEGER },
    isPrivate: { type: DataTypes.BOOLEAN, defaultValue: false },
    refreshToken: { type: DataTypes.TEXT, defaultValue: "token" },
    profile: { type: DataTypes.TEXT, file: true, allowNull: true },
    dob: { type: DataTypes.DATE, allowNull: false, defaultValue: new Date() },
    bio: { type: DataTypes.TEXT },
    googleId: { type: DataTypes.STRING },
    appleId: { type: DataTypes.STRING },
    firebaseToken: { type: DataTypes.STRING },
    emailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    status: {
    type: DataTypes.ENUM("active", "suspended", "inactive"),
    allowNull: false,
    defaultValue: "active",
  },
  },
  {
    hooks: {
      async beforeCreate(instance) {
        instance.password = await hash(instance.password, 10);
      },
    },
  }
);

export default User;
