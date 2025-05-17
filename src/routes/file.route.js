import express from "express";
import asyncHandler from "#utils/asyncHandler";
import FileController from "#controllers/file";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(FileController.get.bind(FileController)))
  .post(asyncHandler(FileController.create.bind(FileController)))
  .put(asyncHandler(FileController.update.bind(FileController)))
  .delete(asyncHandler(FileController.deleteDoc.bind(FileController)));

export default router;
