import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ItineraryShareListController from "#controllers/itineraryShareList";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(ItineraryShareListController.get.bind(ItineraryShareListController)))
  .post(asyncHandler(ItineraryShareListController.create.bind(ItineraryShareListController)))
  .put(asyncHandler(ItineraryShareListController.update.bind(ItineraryShareListController)))
  .delete(asyncHandler(ItineraryShareListController.deleteDoc.bind(ItineraryShareListController)));

export default router;
