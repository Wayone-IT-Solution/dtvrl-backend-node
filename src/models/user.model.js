import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class User extends BaseModel {}

User.initialize({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    //WARN: Unique constraint missing
  },
  permissions: {
    type: DataTypes.JSON,
  },
});

export default User;
