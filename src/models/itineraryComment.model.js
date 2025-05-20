import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class ItineraryComment extends BaseModel {}

ItineraryComment.initialize({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    //WARN: Unique constraint missing
  },
  permissions: {
    type: DataTypes.JSON,
  },
});

export default ItineraryComment;
