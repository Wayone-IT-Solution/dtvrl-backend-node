import express from "express";
import asyncHandler from "#utils/asyncHandler";
import StampController from "#controllers/stamp";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(StampController.get.bind(StampController)))
  .post(asyncHandler(StampController.create.bind(StampController)))
  .put(asyncHandler(StampController.update.bind(StampController)))
  .delete(asyncHandler(StampController.deleteDoc.bind(StampController)));

export default router;
