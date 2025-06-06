import express from "express";
import asyncHandler from "#utils/asyncHandler";
import LocationReviewController from "#controllers/locationReview";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(LocationReviewController.get.bind(LocationReviewController)))
  .post(asyncHandler(LocationReviewController.create.bind(LocationReviewController)))
  .put(asyncHandler(LocationReviewController.update.bind(LocationReviewController)))
  .delete(asyncHandler(LocationReviewController.deleteDoc.bind(LocationReviewController)));

export default router;
