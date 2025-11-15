import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";

class UserBlock extends BaseModel {}

UserBlock.initialize(
  {
    blockerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
      onDelete: "CASCADE",
    },
    blockedId: {
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
        fields: ["blockerId", "blockedId"],
      },
    ],
  },
);

UserBlock.belongsTo(User, {
  foreignKey: "blockerId",
  as: "blocker",
});

UserBlock.belongsTo(User, {
  foreignKey: "blockedId",
  as: "blockedUser",
});

export default UserBlock;

