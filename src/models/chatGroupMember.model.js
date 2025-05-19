import User from "#models/user";
import ChatGroup from "#models/chatGroup";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class ChatGroupMember extends BaseModel {}

ChatGroupMember.initialize(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ChatGroup,
        key: "id",
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

export default ChatGroupMember;
