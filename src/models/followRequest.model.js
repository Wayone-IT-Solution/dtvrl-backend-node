import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";

class FollowRequest extends BaseModel {}

FollowRequest.initialize(
  {
    requesterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
      onDelete: "CASCADE",
    },
    targetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
      onDelete: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM("pending", "accepted", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["requesterId", "targetId"],
      },
    ],
  },
);

FollowRequest.belongsTo(User, {
  foreignKey: "requesterId",
  as: "requester",
});

FollowRequest.belongsTo(User, {
  foreignKey: "targetId",
  as: "target",
});

export default FollowRequest;

