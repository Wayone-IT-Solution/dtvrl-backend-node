import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ReelLikeController from "#controllers/reelLike";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(ReelLikeController.get.bind(ReelLikeController)))
  .post(asyncHandler(ReelLikeController.create.bind(ReelLikeController)))
  .delete(asyncHandler(ReelLikeController.deleteDoc.bind(ReelLikeController)));

export default router;
