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
    onDelete: "CASCADE",
    unqiue: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
    onDelete: "CASCADE",
  },
  image: {
    type: DataTypes.TEXT,
    allowNull: true,
    file: true,
  },
});

Stamp.belongsTo(Memory, {
  foreignKey: "memoryId",
});

Stamp.belongsTo(User, {
  foreignKey: "userId",
});

export default Stamp;
