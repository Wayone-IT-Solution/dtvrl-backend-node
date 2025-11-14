import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ReelController from "#controllers/reel";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

/**
 * PUBLIC ROUTES
 */

// Feed: public reels from public accounts
// GET /api/reel?page=1&limit=10
router.get(
  "/",
  asyncHandler(ReelController.getAll.bind(ReelController)),
);

router.get(
  "/heatmap",
  asyncHandler(ReelController.getHeatmap.bind(ReelController)),
);

router.get(
  "/nearby",
  asyncHandler(ReelController.getNearby.bind(ReelController)),
);

// Single reel (privacy checked inside controller)
// GET /api/reel/123
router.get(
  "/:id(\\d+)",
  asyncHandler(ReelController.get.bind(ReelController)),
);

/**
 * AUTHENTICATED ROUTES
 */
router.use(authentication);

router.get(
  "/feed",
  asyncHandler(ReelController.getFollowerFeed.bind(ReelController)),
);

// Create/upload reel
// POST /api/reel
router.post(
  "/",
  asyncHandler(ReelController.create.bind(ReelController)),
);

/**
 * "My" reels helpers
 * (These match your failing URLs: /api/reel/user/private and /api/reel/user/followers)
 */

// GET /api/reel/user/private?page=1&limit=10
router.get(
  "/user/private",
  asyncHandler(ReelController.getAllPrivate.bind(ReelController)),
);

// GET /api/reel/user/followers?page=1&limit=10
router.get(
  "/user/followers",
  asyncHandler(ReelController.getAllFollowers.bind(ReelController)),
);

/**
 * Reels of a specific user profile
 * e.g. GET /api/reel/user/5?page=1&limit=10
 * NOTE: only matches numeric userId
 */
router.get(
  "/user/:userId(\\d+)",
  asyncHandler(ReelController.getByUserId.bind(ReelController)),
);

// Update reel info (caption, visibility, etc.)
// PATCH /api/reel/123
router.patch(
  "/:id(\\d+)",
  asyncHandler(ReelController.updateInfo.bind(ReelController)),
);

router.post(
  "/:id(\\d+)/was-here",
  asyncHandler(ReelController.toggleWasHere.bind(ReelController)),
);

// Delete reel
// DELETE /api/reel/123
router.delete(
  "/:id(\\d+)",
  asyncHandler(ReelController.delete.bind(ReelController)),
);

export default router;
