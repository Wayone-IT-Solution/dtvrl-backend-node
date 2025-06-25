import User from "#models/user";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import Itinerary from "#models/itinerary";

class ItineraryShareList extends BaseModel {}

ItineraryShareList.initialize(
  {
    itineraryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Itinerary,
        key: Itinerary.primaryKeyAttribute,
      },
      unique: {
        name: "user_itinerary_index",
        msg: "You have already liked this review.",
      },
      onDelete: "CASCADE",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
      unique: {
        name: "user_itinerary_index",
        msg: "You have already liked this review.",
      },
      onDelete: "CASCADE",
    },
  },
  {
    indexes: [
      {
        fields: ["userId", "itineraryId"],
        unique: true,
        name: "user_itinerary_index",
      },
    ],
  },
);

Itinerary.hasMany(ItineraryShareList, {
  foreignKey: "itineraryId",
});

export default ItineraryShareList;
