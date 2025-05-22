import User from "#models/user";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class UserFollow extends BaseModel {}

UserFollow.initialize(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
    },
    otherId: {
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
        fields: ["userId", "otherId"], // prevents duplicate follows
      },
    ],
  },
);

export default UserFollow;
