import express from "express";
import asyncHandler from "#utils/asyncHandler";
import PostCommentController from "#controllers/postComment";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(PostCommentController.get.bind(PostCommentController)))
  .post(asyncHandler(PostCommentController.create.bind(PostCommentController)))
  .delete(
    asyncHandler(PostCommentController.deleteDoc.bind(PostCommentController)),
  );

export default router;
