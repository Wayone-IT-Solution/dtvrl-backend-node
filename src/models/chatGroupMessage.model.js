import User from "#models/user";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import ChatGroup from "#models/chatGroup";

class ChatGroupMessage extends BaseModel {}

ChatGroupMessage.initialize({
  text: {
    type: DataTypes.TEXT,
    allowNull: true,
    //WARN: Unique constraint missing
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ChatGroup,
      key: ChatGroup.primaryKeyAttribute,
    },
    onDelete: "CASCADE",
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
    onDelete: "CASCADE",
  },
  file: {
    type: DataTypes.TEXT,
    allowNull: true,
    file: true,
  },
});

ChatGroupMessage.belongsTo(User, {
  foreignKey: "senderId",
});

ChatGroup.hasMany(ChatGroupMessage, {
  foreignKey: "groupId",
});

export default ChatGroupMessage;
