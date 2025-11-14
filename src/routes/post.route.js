import express from "express";
import asyncHandler from "#utils/asyncHandler";
import PostController from "#controllers/post";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// Public explore + map routes
router.get("/", asyncHandler(PostController.getAll.bind(PostController)));

router.get(
  "/heatmap",
  asyncHandler(PostController.getHeatmap.bind(PostController)),
);

router.get(
  "/nearby",
  asyncHandler(PostController.getNearby.bind(PostController)),
);

router.get(
  "/:id(\\d+)",
  asyncHandler(PostController.get.bind(PostController)),
);

// Authenticated routes
router.use(authentication);

router.get(
  "/feed",
  asyncHandler(PostController.getFollowerFeed.bind(PostController)),
);

router.post("/", asyncHandler(PostController.create.bind(PostController)));

router.get(
  "/user/private",
  asyncHandler(PostController.getAllPrivate.bind(PostController)),
);

router.get(
  "/user/followers",
  asyncHandler(PostController.getAllFollowers.bind(PostController)),
);

router.get(
  "/user/:userId(\\d+)",
  asyncHandler(PostController.getByUserId.bind(PostController)),
);

router.patch(
  "/:id(\\d+)",
  asyncHandler(PostController.updateInfo.bind(PostController)),
);

router.post(
  "/:id(\\d+)/was-here",
  asyncHandler(PostController.toggleWasHere.bind(PostController)),
);

router.delete(
  "/:id(\\d+)",
  asyncHandler(PostController.delete.bind(PostController)),
);

export default router;
