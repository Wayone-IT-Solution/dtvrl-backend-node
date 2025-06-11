import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import Itinerary from "#models/itinerary";
import User from "#models/user";

class ItineraryLike extends BaseModel {}

ItineraryLike.initialize({
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
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["itineraryId", "userId"],
      },
    ],
});

ItineraryLike.belongsTo(Itinerary, {
  foreignKey: "itineraryId",
});

ItineraryLike.belongsTo(User, {
  foreignKey: "userId",
});

Itinerary.hasMany(ItineraryLike, {
  foreignKey: "itineraryId",
});

export default ItineraryLike;
