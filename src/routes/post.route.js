import express from "express";
import asyncHandler from "#utils/asyncHandler";
import PostController from "#controllers/post";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(PostController.get.bind(PostController)))
  .post(asyncHandler(PostController.create.bind(PostController)))
  .put(asyncHandler(PostController.update.bind(PostController)))
  .delete(asyncHandler(PostController.deleteDoc.bind(PostController)));

export default router;
