import User from "#models/user";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class UserFollow extends BaseModel {}

UserFollow.initialize(
  {
    followerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
    },
    followingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["followerId", "followingId"], // prevents duplicate follows
      },
    ],
  },
);

export default UserFollow;
