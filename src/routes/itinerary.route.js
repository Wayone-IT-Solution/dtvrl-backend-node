import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ItineraryController from "#controllers/itinerary";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/shared")
  .get(
    asyncHandler(
      ItineraryController.getSharedItinerary.bind(ItineraryController),
    ),
  );

router
  .route("/share-all")
  .post(
    asyncHandler(ItineraryController.shareWithAll.bind(ItineraryController)),
  );

router
  .route("/:id?")
  .get(asyncHandler(ItineraryController.get.bind(ItineraryController)))
  .post(asyncHandler(ItineraryController.create.bind(ItineraryController)))
  .put(asyncHandler(ItineraryController.update.bind(ItineraryController)))
  .delete(
    asyncHandler(ItineraryController.deleteDoc.bind(ItineraryController)),
  );

export default router;
