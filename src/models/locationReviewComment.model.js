import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";
import LocationReview from "#models/locationReview";

class LocationReviewComment extends BaseModel {}

LocationReviewComment.initialize({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
    onDelete: "CASCADE",
  },
  locationReviewId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: LocationReview,
      key: LocationReview.primaryKeyAttribute,
    },
    onDelete: "CASCADE",
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

LocationReview.hasMany(LocationReviewComment, {
  foreignKey: "locationReviewId",
});

LocationReviewComment.belongsTo(User, {
  foreignKey: "userId",
});

export default LocationReviewComment;
