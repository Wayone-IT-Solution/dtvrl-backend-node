import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class Notification extends BaseModel {}

Notification.initialize({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    //WARN: Unique constraint missing
  },
  permissions: {
    type: DataTypes.JSON,
  },
});

export default Notification;
