import express from "express";
import asyncHandler from "#utils/asyncHandler";
import LocationReviewLikeController from "#controllers/locationReviewLike";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(
    asyncHandler(
      LocationReviewLikeController.get.bind(LocationReviewLikeController),
    ),
  )
  .post(
    asyncHandler(
      LocationReviewLikeController.create.bind(LocationReviewLikeController),
    ),
  )
  .put(
    asyncHandler(
      LocationReviewLikeController.update.bind(LocationReviewLikeController),
    ),
  )
  .delete(
    asyncHandler(
      LocationReviewLikeController.deleteDoc.bind(LocationReviewLikeController),
    ),
  );

export default router;
