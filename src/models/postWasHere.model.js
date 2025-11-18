import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";
import Post from "#models/post";

class PostWasHere extends BaseModel {}

PostWasHere.initialize(
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    paranoid: true,           // enables soft delete (uses deletedAt)
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["postId", "userId"],
      },
    ],
  }
);

export default PostWasHere;
