import express from "express";
import asyncHandler from "#utils/asyncHandler";
import AdminController from "#controllers/admin";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router
  .route("/login")
  .post(asyncHandler(AdminController.login.bind(AdminController)));

router.use(authentication);

router
  .route("/get-current-user")
  .get(asyncHandler(AdminController.getCurrentUser.bind(AdminController)));

router
  .route("/chat-groups")
  .get(asyncHandler(AdminController.getChatgroups.bind(AdminController)));

router
  .route("/memories")
  .get(asyncHandler(AdminController.getMemories.bind(AdminController)));

router
  .route("/stamps")
  .get(asyncHandler(AdminController.getStamps.bind(AdminController)));

router
  .route("/users/:id?")
  .get(asyncHandler(AdminController.getUsers.bind(AdminController)))
  .post(asyncHandler(AdminController.createUsers.bind(AdminController)))
  .put(asyncHandler(AdminController.updateUsers.bind(AdminController)))
  .delete(asyncHandler(AdminController.deleteUsers.bind(AdminController)));

router
  .route("/posts/:id?")
  .get(asyncHandler(AdminController.getPosts.bind(AdminController)));

router
  .route("/buckets/:id?")
  .get(asyncHandler(AdminController.getBuckets.bind(AdminController)))
  .post(asyncHandler(AdminController.createBuckets.bind(AdminController)));

router
  .route("/locations/:id?")
  .get(asyncHandler(AdminController.getLocations.bind(AdminController)));

// router
//   .route("/itineraries/:id?")
//   .get(asyncHandler(AdminController.getItineraries.bind(AdminController)));
// .post(asyncHandler(AdminController.createItinerary.bind(AdminController)))
// .put(asyncHandler(AdminController.updateItinerary.bind(AdminController)))
// .delete(asyncHandler(AdminController.deleteItinerary.bind(AdminController)));

router
  .route("/location-reviews/:id?")
  .get(asyncHandler(AdminController.getLocationReviews.bind(AdminController)));

router
  .route("/:id?")
  .get(asyncHandler(AdminController.get.bind(AdminController)))
  .post(asyncHandler(AdminController.create.bind(AdminController)))
  .put(asyncHandler(AdminController.update.bind(AdminController)))
  .delete(asyncHandler(AdminController.deleteDoc.bind(AdminController)));

export default router;
