import User from "#models/user";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import httpStatus from "http-status";
import AppError from "#utils/appError";

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
      onDelete: "CASCADE",
    },
    otherId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
      onDelete: "CASCADE",
    },
  },
  {
    validate: {
      notSelfFollow() {
        if (this.userId === this.otherId) {
          throw new AppError({
            status: false,
            message: "User cannot follow themselves",
            httpStatus: httpStatus.CONFLICT,
          });
        }
      },
    },
    indexes: [
      {
        unique: true,
        fields: ["userId", "otherId"], // prevents duplicate follows
      },
    ],
  },
);

UserFollow.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

UserFollow.belongsTo(User, {
  foreignKey: "otherId",
  as: "otherUser",
});

export default UserFollow;
