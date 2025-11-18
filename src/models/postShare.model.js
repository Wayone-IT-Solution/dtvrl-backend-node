// src/models/postShare.js
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";
import Post from "#models/post";

class PostShare extends BaseModel {}

PostShare.initialize(
  {
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Post,
        key: Post.primaryKeyAttribute,
      },
      onDelete: "CASCADE",
    },
    sharedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
      onDelete: "CASCADE",
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["postId", "sharedBy"],
      },
    ],
  }
);

export default PostShare;
