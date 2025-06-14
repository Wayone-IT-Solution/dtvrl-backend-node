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
    unqiue: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
  },
  image: {
    type: DataTypes.TEXT,
    allowNull: true,
    file: true,
  },
});

export default Stamp;
