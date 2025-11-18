import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ReelCommentController from "#controllers/reelComment";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(ReelCommentController.get.bind(ReelCommentController)))
  .post(asyncHandler(ReelCommentController.create.bind(ReelCommentController)))
  .delete(asyncHandler(ReelCommentController.deleteDoc.bind(ReelCommentController)));

export default router;
