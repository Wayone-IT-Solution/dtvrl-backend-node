import User from "#models/user";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class Bucket extends BaseModel {}

Bucket.initialize({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: false,
    refernces: {
      model: User,
      key: User.primaryKeyAttribute,
    },
    onDelete: "CASCADE",
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  visited: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});

Bucket.belongsTo(User, {
  foreignKey: "userId",
});

export default Bucket;
