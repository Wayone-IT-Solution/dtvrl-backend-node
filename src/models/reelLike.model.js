import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";
import Reel from "#models/reel";

class ReelLike extends BaseModel {}

ReelLike.initialize(
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
    reelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Reel,
        key: Reel.primaryKeyAttribute,
      },
      onDelete: "CASCADE",
    },
  },
  {
    paranoid: true, // ✅ ENABLE SOFT DELETE
    deletedAt: "deletedAt",
    indexes: [
      {
        unique: true,
        fields: ["reelId", "userId"],
      },
    ],
  }
);

export default ReelLike;
