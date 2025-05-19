import Post from "#models/post";
import User from "#models/user";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

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
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Post,
        key: Post.primaryKeyAttribute,
      },
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["postId", "userId"],
      },
    ],
  },
);

export default PostLike;
