import express from "express";
import asyncHandler from "#utils/asyncHandler";
import PostController from "#controllers/post";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

/**
 * ---------------------------------------------------------
 * PUBLIC ROUTES (Don't require login)
 * ---------------------------------------------------------
 */

// Explore Feed
router.get("/", asyncHandler(PostController.getAll.bind(PostController)));

// Heatmap
router.get(
  "/heatmap",
  asyncHandler(PostController.getHeatmap.bind(PostController))
);

// Nearby API
router.get(
  "/nearby",
  asyncHandler(PostController.getNearby.bind(PostController))
);

// Single Post (public if allowed based on visibility)
router.get(
  "/post/:id(\\d+)",
  asyncHandler(PostController.get.bind(PostController))
);

/**
 * ---------------------------------------------------------
 * PROTECTED ROUTES (Login required)
 * ---------------------------------------------------------
 */
router.use(authentication);

// Follower Feed
router.get(
  "/feed",
  asyncHandler(PostController.getFollowerFeed.bind(PostController))
);

// Create Post
router.post("/", asyncHandler(PostController.create.bind(PostController)));

// User Private Posts
router.get(
  "/user/private",
  asyncHandler(PostController.getAllPrivate.bind(PostController))
);

// User Followers-Only Posts
router.get(
  "/user/followers",
  asyncHandler(PostController.getAllFollowers.bind(PostController))
);

// Posts By User ID
router.get(
  "/user/:userId(\\d+)",
  asyncHandler(PostController.getByUserId.bind(PostController))
);

// Update Post
router.patch(
  "/:id(\\d+)",
  asyncHandler(PostController.updateInfo.bind(PostController))
);

// Toggle WasHere
router.post(
  "/:id(\\d+)/was-here",
  asyncHandler(PostController.toggleWasHere.bind(PostController))
);

// Delete Post
router.delete(
  "/:id(\\d+)",
  asyncHandler(PostController.delete.bind(PostController))
);

export default router;
