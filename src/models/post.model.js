import User from "#models/user";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class Post extends BaseModel {}

Post.initialize({
  caption: {
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
  image: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

export default Post;
