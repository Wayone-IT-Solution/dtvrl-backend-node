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
    onDelete: "CASCADE",
  },
  image: {
    type: DataTypes.TEXT,
    file: true,
    allowNull: true,
  },
});

Post.belongsTo(User, {
  foreignKey: "userId",
});

export default Post;
