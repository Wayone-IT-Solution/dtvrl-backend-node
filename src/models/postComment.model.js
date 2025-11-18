import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import User from "#models/user";
import Post from "#models/post";

class PostComment extends BaseModel {}

PostComment.initialize(
  {
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
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
        model: "Posts",
        key: "id",
      },
      onDelete: "CASCADE",
    },
  },
  {
    tableName: "PostComments",
    modelName: "PostComment",
    indexes: [{ fields: ["postId"] }],
  }
);

export default PostComment;
