import BaseModel from "#models/base";
import User from "#models/user";
import { DataTypes } from "sequelize";

class Reel extends BaseModel {}

Reel.initialize({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
    onDelete: "CASCADE",
  },
  videoUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  thumbnailUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  caption: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  musicId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  filterId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  locationLat: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  locationLng: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  locationName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  taggedUserIds: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  visibility: {
    type: DataTypes.ENUM("public", "followers", "private"),
    allowNull: false,
    defaultValue: "public",
  },
  wasHereCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
});

Reel.belongsTo(User, {
  foreignKey: "userId",
});

export default Reel;
