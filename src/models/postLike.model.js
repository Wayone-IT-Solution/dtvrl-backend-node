// src/models/postLike.js
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";
import Post from "#models/post"; // IMPORTANT

class PostLike extends BaseModel {}

PostLike.initialize(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
      onDelete: "CASCADE",
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Post,
        key: Post.primaryKeyAttribute,
      },
      onDelete: "CASCADE",
    },
  },
  {
    paranoid: true,        // ✅ ENABLE SOFT DELETE
    deletedAt: "deletedAt",
    indexes: [
      {
        unique: true,
        fields: ["postId", "userId"],
      },
    ],
  }
);

export default PostLike;
