import User from "#models/user";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class Bucket extends BaseModel {}

Bucket.initialize({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    refernces: {
      model: User,
      key: User.primaryKeyAttribute,
    },
  },
  locations: {
    type: DataTypes.JSON,
  },
});

export default Bucket;
