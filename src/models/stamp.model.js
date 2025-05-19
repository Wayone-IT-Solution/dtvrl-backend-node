import User from "#models/user";
import Memory from "#models/memory";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class Stamp extends BaseModel {}

Stamp.initialize({
  memoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Memory,
      key: Memory.primaryKeyAttribute,
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
  },
});

export default Stamp;
