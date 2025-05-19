import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class Memory extends BaseModel {}

//FIX: This part is not clear,

Memory.initialize({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

export default Memory;
