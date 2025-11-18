// src/models/index.js
/**
 * Central model loader — import all model definitions (no associations inside models),
 * then wire associations here to avoid circular imports.
 *
 * Use project alias: "#models" -> "./src/models/index.js"
 */

import Post from "./post.model.js";
import PostComment from "./postComment.model.js";
import PostLike from "./postLike.model.js";
import PostShare from "./postShare.model.js";
import PostView from "./postView.model.js";
import PostWasHere from "./postWasHere.model.js";
import User from "./user.model.js";
import UserFollow from "./userFollow.model.js";
import Reel from "./reel.model.js";
import ReelComment from "./reelComment.model.js";
import ReelLike from "./reelLike.model.js";
import ReelShare from "./reelShare.model.js";
import ReelView from "./reelView.model.js";
import ReelWasHere from "./reelWasHere.model.js";

/* ----------------------------
   Associations (centralized)
   ---------------------------- */

// Post -> User (owner)
Post.belongsTo(User, { foreignKey: "userId", as: "user" });

// User -> Following (users that this user follows)
User.hasMany(UserFollow, { foreignKey: "userId", as: "userFollowings", onDelete: "CASCADE" });

// User -> Followers (users that follow this user)
User.hasMany(UserFollow, { foreignKey: "otherId", as: "userFollowers", onDelete: "CASCADE" });

// UserFollow associations (already defined in userFollow.model.js, but ensure they're available)
UserFollow.belongsTo(User, { foreignKey: "userId", as: "user" });
UserFollow.belongsTo(User, { foreignKey: "otherId", as: "otherUser" });

// Post -> Comments
Post.hasMany(PostComment, { foreignKey: "postId", as: "comments", onDelete: "CASCADE" });
PostComment.belongsTo(Post, { foreignKey: "postId", as: "post" });
PostComment.belongsTo(User, { foreignKey: "userId", as: "commentUser" });

// Post -> Likes
Post.hasMany(PostLike, { foreignKey: "postId", as: "likes", onDelete: "CASCADE" });
PostLike.belongsTo(Post, { foreignKey: "postId", as: "post" });
PostLike.belongsTo(User, { foreignKey: "userId", as: "likeUser" });

// Post -> Shares
Post.hasMany(PostShare, { foreignKey: "postId", as: "shares", onDelete: "CASCADE" });
PostShare.belongsTo(Post, { foreignKey: "postId", as: "post" });
PostShare.belongsTo(User, { foreignKey: "sharedBy", as: "sharedByUser" });

// Post -> Views
Post.hasMany(PostView, { foreignKey: "postId", as: "views", onDelete: "CASCADE" });
PostView.belongsTo(Post, { foreignKey: "postId", as: "post" });
PostView.belongsTo(User, { foreignKey: "userId", as: "viewUser" });

// Post -> WasHere
Post.hasMany(PostWasHere, { foreignKey: "postId", as: "wasHere", onDelete: "CASCADE" });
PostWasHere.belongsTo(Post, { foreignKey: "postId", as: "post" });
PostWasHere.belongsTo(User, { foreignKey: "userId", as: "wasHereUser" });

/* ----------------------------
  Reel Associations
  ---------------------------- */

// Reel -> User (owner)
Reel.belongsTo(User, { foreignKey: "userId", as: "user" });

// Reel -> Comments
Reel.hasMany(ReelComment, { foreignKey: "reelId", as: "comments", onDelete: "CASCADE" });
ReelComment.belongsTo(Reel, { foreignKey: "reelId", as: "reel" });
ReelComment.belongsTo(User, { foreignKey: "userId", as: "commentUser" });

// Reel -> Likes
Reel.hasMany(ReelLike, { foreignKey: "reelId", as: "likes", onDelete: "CASCADE" });
ReelLike.belongsTo(Reel, { foreignKey: "reelId", as: "reel" });
ReelLike.belongsTo(User, { foreignKey: "userId", as: "likeUser" });

// Reel -> Shares
Reel.hasMany(ReelShare, { foreignKey: "reelId", as: "shares", onDelete: "CASCADE" });
ReelShare.belongsTo(Reel, { foreignKey: "reelId", as: "reel" });
ReelShare.belongsTo(User, { foreignKey: "sharedBy", as: "sharedByUser" });

// Reel -> Views
Reel.hasMany(ReelView, { foreignKey: "reelId", as: "views", onDelete: "CASCADE" });
ReelView.belongsTo(Reel, { foreignKey: "reelId", as: "reel" });
ReelView.belongsTo(User, { foreignKey: "userId", as: "viewUser" });

// Reel -> WasHere
Reel.hasMany(ReelWasHere, { foreignKey: "reelId", as: "wasHere", onDelete: "CASCADE" });
ReelWasHere.belongsTo(Reel, { foreignKey: "reelId", as: "reel" });
ReelWasHere.belongsTo(User, { foreignKey: "userId", as: "wasHereUser" });

export {
  User,
  UserFollow,
  Post,
  PostComment,
  PostLike,
  PostShare,
  PostView,
  PostWasHere,
  Reel,
  ReelComment,
  ReelLike,
  ReelShare,
  ReelView,
  ReelWasHere,
};
export default {
  User,
  UserFollow,
  Post,
  PostComment,
  PostLike,
  PostShare,
  PostView,
  PostWasHere,
  Reel,
  ReelComment,
  ReelLike,
  ReelShare,
  ReelView,
  ReelWasHere,
};
