import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import Itinerary from "#models/itinerary";
import User from "#models/user";

class ItineraryShareList extends BaseModel {}

ItineraryShareList.initialize({
  itineraryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Itinerary,
      key: Itinerary.primaryKeyAttribute,
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
  },
});

Itinerary.hasMany(ItineraryShareList, {
  foreignKey: "itineraryId",
});

export default ItineraryShareList;
