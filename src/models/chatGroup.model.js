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
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
  },
  profile: {
    type: DataTypes.TEXT,
    file: true,
    defaultValue: "user-profile.png",
  },
});

ChatGroup.belongsTo(User, {
  foreignKey: "adminId",
  as: "Admin",
});

export default ChatGroup;
