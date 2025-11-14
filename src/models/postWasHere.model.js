import BaseModel from "#models/base";
import Post from "#models/post";
import User from "#models/user";
import { DataTypes } from "sequelize";

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
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["userId", "postId"],
      },
    ],
  },
);

PostWasHere.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

PostWasHere.belongsTo(Post, {
  foreignKey: "postId",
  as: "post",
});

export default PostWasHere;
