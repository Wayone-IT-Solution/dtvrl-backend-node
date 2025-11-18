import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";
import Reel from "#models/reel";

class ReelComment extends BaseModel {}

ReelComment.initialize(
  {
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
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
    tableName: "ReelComments",
    modelName: "ReelComment",
    indexes: [{ fields: ["reelId"] }],
  }
);

export default ReelComment;