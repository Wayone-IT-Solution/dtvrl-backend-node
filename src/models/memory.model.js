import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";

class Memory extends BaseModel {}

//FIX: This part is not clear,

Memory.initialize({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
  },
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
  coverImage: {
    type: DataTypes.TEXT,
    file: true,
  },
});

export default Memory;
