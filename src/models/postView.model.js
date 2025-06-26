import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import Post from "#models/post";
import User from "#models/user";

class PostView extends BaseModel {}

PostView.initialize({
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Post,
      key: Post.primaryKeyAttribute,
    },
    onDelete: "CASCADE",
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
});

export default PostView;
