import express from "express";
import asyncHandler from "#utils/asyncHandler";
import PostLikeController from "#controllers/postLike";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(PostLikeController.get.bind(PostLikeController)))
  .post(asyncHandler(PostLikeController.create.bind(PostLikeController)))
  .delete(asyncHandler(PostLikeController.deleteDoc.bind(PostLikeController)));

export default router;
