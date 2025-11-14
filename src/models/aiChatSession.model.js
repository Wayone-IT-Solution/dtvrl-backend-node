import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";

class AiChatSession extends BaseModel {}

AiChatSession.initialize({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
    onDelete: "CASCADE",
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastInteractionAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

AiChatSession.belongsTo(User, {
  foreignKey: "userId",
});

export default AiChatSession;
