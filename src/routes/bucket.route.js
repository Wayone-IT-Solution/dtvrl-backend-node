import express from "express";
import asyncHandler from "#utils/asyncHandler";
import BucketController from "#controllers/bucket";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(BucketController.get.bind(BucketController)))
  .post(asyncHandler(BucketController.create.bind(BucketController)))
  .put(asyncHandler(BucketController.update.bind(BucketController)))
  .delete(asyncHandler(BucketController.deleteDoc.bind(BucketController)));

export default router;
