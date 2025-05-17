import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class Role extends BaseModel {}

Role.initialize({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    //WARN: Unique constraint missing
  },
  permissions: {
    type: DataTypes.JSON,
  },
});

export default Role;
