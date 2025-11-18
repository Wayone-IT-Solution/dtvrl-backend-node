// src/models/post.js

import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";

class Post extends BaseModel {}

Post.initialize({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
    onDelete: "CASCADE",
  },

  image: {
    type: DataTypes.TEXT,
    file: true,
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

  // ------------------ NEW STATUS FIELD ------------------
  status: {
    type: DataTypes.ENUM("active", "suspended", "inactive"),
    allowNull: false,
    defaultValue: "active",
  },
});

export default Post;
