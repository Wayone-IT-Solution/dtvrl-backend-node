import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ReelViewController from "#controllers/reelView";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(ReelViewController.get.bind(ReelViewController)))
  .post(asyncHandler(ReelViewController.create.bind(ReelViewController)))
  .delete(asyncHandler(ReelViewController.deleteDoc.bind(ReelViewController)));

export default router;
