import express from "express";
import asyncHandler from "#utils/asyncHandler";
import LocationController from "#controllers/location";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(LocationController.get.bind(LocationController)))
  .post(asyncHandler(LocationController.create.bind(LocationController)))
  .put(asyncHandler(LocationController.update.bind(LocationController)))
  .delete(asyncHandler(LocationController.deleteDoc.bind(LocationController)));

export default router;
