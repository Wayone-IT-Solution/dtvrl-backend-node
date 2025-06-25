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
    indexes: [
      {
        unique: true,
        fields: ["postId", "userId"],
      },
    ],
  },
);

Post.hasMany(PostLike, {
  foreignKey: "postId",
});

export default PostLike;
