import User from "#models/user";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class UserSession extends BaseModel {}

UserSession.initialize({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  lastPingAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

export default UserSession;
