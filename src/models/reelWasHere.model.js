import BaseModel from "#models/base";
import Reel from "#models/reel";
import User from "#models/user";
import { DataTypes } from "sequelize";

class ReelWasHere extends BaseModel {}

ReelWasHere.initialize(
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
    indexes: [
      {
        unique: true,
        fields: ["userId", "reelId"],
      },
    ],
  },
);

ReelWasHere.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

ReelWasHere.belongsTo(Reel, {
  foreignKey: "reelId",
  as: "reel",
});

export default ReelWasHere;
