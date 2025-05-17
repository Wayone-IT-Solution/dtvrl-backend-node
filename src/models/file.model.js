import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class File extends BaseModel {}

File.initialize({
  name: {
    type: DataTypes.STRING,
  },
  path: {
    type: DataTypes.TEXT,
    allowNull: false,
    file: true,
  },
});

export default File;
