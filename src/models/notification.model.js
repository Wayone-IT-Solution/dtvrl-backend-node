import User from "#models/user";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class Notification extends BaseModel {}

Notification.initialize({
  notification: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
  },
  readByUser: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});

export default Notification;
