import User from "#models/user";
import Post from "#models/post";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class PostComment extends BaseModel {}

PostComment.initialize({
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
  },
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Post,
      key: Post.primaryKeyAttribute,
    },
  },
});

Post.hasMany(PostComment, {
  foreignKey: "postId",
});

export default PostComment;
