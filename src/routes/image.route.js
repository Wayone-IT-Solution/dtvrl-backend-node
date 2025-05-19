import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ImageController from "#controllers/image";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(ImageController.get.bind(ImageController)))
  .post(asyncHandler(ImageController.create.bind(ImageController)))
  .put(asyncHandler(ImageController.update.bind(ImageController)))
  .delete(asyncHandler(ImageController.deleteDoc.bind(ImageController)));

export default router;
