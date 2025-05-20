import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class ItineraryRecommend extends BaseModel {}

ItineraryRecommend.initialize({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    //WARN: Unique constraint missing
  },
  permissions: {
    type: DataTypes.JSON,
  },
});

export default ItineraryRecommend;
