import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ItineraryLikeController from "#controllers/itineraryLike";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(ItineraryLikeController.get.bind(ItineraryLikeController)))
  .post(asyncHandler(ItineraryLikeController.create.bind(ItineraryLikeController)))
  .put(asyncHandler(ItineraryLikeController.update.bind(ItineraryLikeController)))
  .delete(asyncHandler(ItineraryLikeController.deleteDoc.bind(ItineraryLikeController)));

export default router;
