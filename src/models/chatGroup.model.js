import User from "#models/user";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class ChatGroup extends BaseModel {}

ChatGroup.initialize({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    //WARN: Unique constraint missing
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
  },
});

export default ChatGroup;
