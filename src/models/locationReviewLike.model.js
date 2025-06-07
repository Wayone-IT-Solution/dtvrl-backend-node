import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";
import LocationReview from "#models/locationReview";

class LocationReviewLike extends BaseModel {}

LocationReviewLike.initialize(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
      unique: {
        name: "user_locationreview_index",
        msg: "You have already liked this review.",
      },
    },
    locationReviewId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: LocationReview,
        key: LocationReview.primaryKeyAttribute,
      },
    },
  },
  {
    indexes: [
      {
        fields: ["userId", "locationReviewId"],
        unique: true,
        name: "user_locationreview_index",
      },
    ],
  },
);

LocationReview.hasMany(LocationReviewLike, {
  foreignKey: "locationReviewId",
});

LocationReviewLike.belongsTo(User, {
  foreignKey: "userId",
});

export default LocationReviewLike;
