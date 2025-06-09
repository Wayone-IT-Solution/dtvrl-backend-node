import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ItineraryShareListController from "#controllers/itineraryShareList";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .post(
    asyncHandler(
      ItineraryShareListController.create.bind(ItineraryShareListController),
    ),
  );

export default router;
