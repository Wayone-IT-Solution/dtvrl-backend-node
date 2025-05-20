import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ItineraryCommentController from "#controllers/itineraryComment";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(ItineraryCommentController.get.bind(ItineraryCommentController)))
  .post(asyncHandler(ItineraryCommentController.create.bind(ItineraryCommentController)))
  .put(asyncHandler(ItineraryCommentController.update.bind(ItineraryCommentController)))
  .delete(asyncHandler(ItineraryCommentController.deleteDoc.bind(ItineraryCommentController)));

export default router;
