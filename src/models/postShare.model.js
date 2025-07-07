import User from "#models/user";
import Post from "#models/post";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class PostShare extends BaseModel {}

PostShare.initialize({
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Post,
      key: Post.primaryKeyAttribute,
    },
  },
  sharedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
  },
});

export default PostShare;
