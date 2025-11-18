import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";
import Reel from "#models/reel";

class ReelShare extends BaseModel {}

ReelShare.initialize(
  {
    reelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Reel,
        key: Reel.primaryKeyAttribute,
      },
      onDelete: "CASCADE",
    },
    sharedBy: {
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
    indexes: [
      {
        unique: true,
        fields: ["reelId", "sharedBy"],
      },
    ],
  }
);

export default ReelShare;