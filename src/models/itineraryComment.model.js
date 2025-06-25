import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import Itinerary from "#models/itinerary";
import User from "#models/user";

class ItineraryComment extends BaseModel {}

ItineraryComment.initialize({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
    onDelete: "CASCADE",
  },
  itineraryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Itinerary,
      key: Itinerary.primaryKeyAttribute,
    },
    onDelete: "CASCADE",
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

ItineraryComment.belongsTo(User, {
  foreignKey: "userId",
});

ItineraryComment.belongsTo(Itinerary, {
  foreignKey: "itineraryId",
});

Itinerary.hasMany(ItineraryComment, {
  foreignKey: "itineraryId",
});

export default ItineraryComment;
