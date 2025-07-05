import User from "#models/user";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import Itinerary from "#models/itinerary";

class ItineraryRecommend extends BaseModel {}

ItineraryRecommend.initialize({
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

// Existing
Itinerary.hasMany(ItineraryRecommend, {
  foreignKey: "itineraryId",
  as: "ItineraryRecommends", // optional alias if you want to count all recommends
});

// ✅ NEW: For checking if current user has recommended
Itinerary.hasOne(ItineraryRecommend, {
  foreignKey: "itineraryId",
  as: "UserRecommendation", // <== this must match the include alias
});

Itinerary.belongsTo(User, {
  foreignKey: "userId",
});

export default ItineraryRecommend;
