import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";

class Itinerary extends BaseModel {}

Itinerary.initialize({
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    //WARN: Unique constraint missing
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  startDate: {
    type: DataTypes.DATE,
  },
  endDate: {
    type: DataTypes.DATE,
  },
  public: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
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
  description: {
    type: DataTypes.TEXT,
  },
  peopleCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
});

Itinerary.belongsTo(User, {
  foreignKey: "userId",
});

export default Itinerary;
