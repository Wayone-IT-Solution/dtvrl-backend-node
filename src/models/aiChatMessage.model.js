import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import AiChatSession from "#models/aiChatSession";

class AiChatMessage extends BaseModel {}

AiChatMessage.initialize({
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: AiChatSession,
      key: AiChatSession.primaryKeyAttribute,
    },
    onDelete: "CASCADE",
  },
  role: {
    type: DataTypes.ENUM("system", "user", "assistant"),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
  },
});

AiChatMessage.belongsTo(AiChatSession, {
  foreignKey: "sessionId",
});

AiChatSession.hasMany(AiChatMessage, {
  foreignKey: "sessionId",
});

export default AiChatMessage;
