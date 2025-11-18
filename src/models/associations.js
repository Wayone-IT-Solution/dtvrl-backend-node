// src/models/associations.js

import {
  User,
  Post,
  PostComment,
  PostLike,
  PostShare,
  PostView,
  PostWasHere,
} from "./index.js";

export function applyAssociations() {
  /* ---------------- USER ↔ POST ---------------- */
  User.hasMany(Post, { foreignKey: "userId", as: "posts" });
  Post.belongsTo(User, { foreignKey: "userId", as: "user" });

  /* ---------------- POST ↔ COMMENT ---------------- */
  Post.hasMany(PostComment, { foreignKey: "postId", as: "comments" });
  PostComment.belongsTo(Post, { foreignKey: "postId", as: "post" });

  // Important alias
  PostComment.belongsTo(User, {
    foreignKey: "userId",
    as: "commentUser",
  });

  /* ---------------- POST ↔ LIKE ---------------- */
  Post.hasMany(PostLike, { foreignKey: "postId", as: "likes" });
  PostLike.belongsTo(Post, { foreignKey: "postId", as: "post" });

  PostLike.belongsTo(User, {
    foreignKey: "userId",
    as: "likeUser",
  });

  /* ---------------- POST ↔ SHARE ---------------- */
  Post.hasMany(PostShare, { foreignKey: "postId", as: "shares" });
  PostShare.belongsTo(Post, { foreignKey: "postId", as: "post" });

  PostShare.belongsTo(User, {
    foreignKey: "sharedBy",
    as: "sharedByUser",
  });

  /* ---------------- POST ↔ VIEW ---------------- */
  Post.hasMany(PostView, { foreignKey: "postId", as: "views" });
  PostView.belongsTo(Post, { foreignKey: "postId", as: "post" });

  PostView.belongsTo(User, {
    foreignKey: "userId",
    as: "viewUser",
  });

  /* ---------------- POST ↔ WAS HERE ---------------- */
  Post.hasMany(PostWasHere, { foreignKey: "postId", as: "wasHere" });
  PostWasHere.belongsTo(Post, { foreignKey: "postId", as: "post" });

  PostWasHere.belongsTo(User, {
    foreignKey: "userId",
    as: "wasHereUser",
  });
}
