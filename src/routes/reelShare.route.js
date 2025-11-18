import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ReelShareController from "#controllers/reelShare";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(ReelShareController.get.bind(ReelShareController)))
  .post(asyncHandler(ReelShareController.create.bind(ReelShareController)))
  .put(asyncHandler(ReelShareController.update.bind(ReelShareController)))
  .delete(asyncHandler(ReelShareController.deleteDoc.bind(ReelShareController)));

export default router;
