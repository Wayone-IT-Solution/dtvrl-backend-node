import Memory from "#models/memory";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class Image extends BaseModel {}

Image.initialize({
  name: {
    type: DataTypes.STRING,
    allowNull: true,
    file: true,
  },
  memoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Memory,
      key: Memory.primaryKeyAttribute,
    },
    onDelete: "CASCADE",
  },
});

export default Image;
