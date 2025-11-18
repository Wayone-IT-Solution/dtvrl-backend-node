import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";
import Reel from "#models/reel";

class ReelView extends BaseModel {}

ReelView.initialize(
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
    userId: {
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
        fields: ["reelId", "userId"],
      },
    ],
  }
);

export default ReelView;