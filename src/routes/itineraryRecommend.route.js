import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ItineraryRecommendController from "#controllers/itineraryRecommend";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(ItineraryRecommendController.get.bind(ItineraryRecommendController)))
  .post(asyncHandler(ItineraryRecommendController.create.bind(ItineraryRecommendController)))
  .put(asyncHandler(ItineraryRecommendController.update.bind(ItineraryRecommendController)))
  .delete(asyncHandler(ItineraryRecommendController.deleteDoc.bind(ItineraryRecommendController)));

export default router;
