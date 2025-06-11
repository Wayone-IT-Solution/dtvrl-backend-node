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
      unique: {
        name: "user_location_index",
        msg: "You have already reviewed this location.",
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
    recommended: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    indexes: [
      {
        name: "user_location_index",
        unique: true,
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

LocationReview.belongsTo(Location, {
  foreignKey: "locationId",
});

export default LocationReview;
