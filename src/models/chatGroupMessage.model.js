import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import ChatGroup from "#models/chatGroup";
import User from "#models/user";

class ChatGroupMessage extends BaseModel {}

ChatGroupMessage.initialize({
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
    //WARN: Unique constraint missing
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ChatGroup,
      key: ChatGroup.primaryKeyAttribute,
    },
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
  },
});

ChatGroupMessage.belongsTo(User,{
  foreignKey:"senderId"
})

ChatGroup.hasMany(ChatGroupMessage,{
  foreignKey:"groupId"
})

export default ChatGroupMessage;
