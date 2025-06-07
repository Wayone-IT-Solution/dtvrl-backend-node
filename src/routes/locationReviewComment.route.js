import express from "express";
import asyncHandler from "#utils/asyncHandler";
import LocationReviewCommentController from "#controllers/locationReviewComment";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(
    asyncHandler(
      LocationReviewCommentController.get.bind(LocationReviewCommentController),
    ),
  )
  .post(
    asyncHandler(
      LocationReviewCommentController.create.bind(
        LocationReviewCommentController,
      ),
    ),
  )
  .put(
    asyncHandler(
      LocationReviewCommentController.update.bind(
        LocationReviewCommentController,
      ),
    ),
  )
  .delete(
    asyncHandler(
      LocationReviewCommentController.deleteDoc.bind(
        LocationReviewCommentController,
      ),
    ),
  );

export default router;
