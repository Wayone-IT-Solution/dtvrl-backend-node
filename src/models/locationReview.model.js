import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";
import Location from "#models/location";

class LocationReview extends BaseModel {}

LocationReview.initialize(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
    },
    locationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Location,
        key: Location.primaryKeyAttribute,
      },
    },
    review: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
  },
  {
    indexes: [
      {
        name: "user_location_index",
        unique: false,
        fields: ["userId", "locationId"],
      },
    ],
  },
);

Location.hasMany(LocationReview, {
  foreignKey: "locationId",
});

LocationReview.belongsTo(User, {
  foreignKey: "userId",
});

export default LocationReview;
