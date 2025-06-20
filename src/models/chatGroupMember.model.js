import User from "#models/user";
import BaseModel from "#models/base";
import ChatGroup from "#models/chatGroup";
import { DataTypes } from "sequelize";

class ChatGroupMember extends BaseModel {}

ChatGroupMember.initialize(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ChatGroup,
        key: ChatGroup.primaryKeyAttribute,
      },
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["userId", "groupId"], // prevents duplicate membership
      },
    ],
  },
);

ChatGroupMember.belongsTo(
  User,
  {foreignKey:"userId"}
)

export default ChatGroupMember;
