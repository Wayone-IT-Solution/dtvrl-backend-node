// src/routes/admin.route.js
import express from "express";
import asyncHandler from "#utils/asyncHandler";
import AdminController from "#controllers/admin";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

/**
 * PUBLIC ROUTES
 */
router.post(
  "/login",
  asyncHandler(AdminController.login.bind(AdminController))
);

/**
 * PROTECTED ROUTES
 */
router.use(authentication);
router.use((req, res, next) => AdminController.verifyAdmin(req, res, next));

/** ADMIN PROFILE **/
router.post(
  "/change-pass",
  asyncHandler(AdminController.changePass.bind(AdminController))
);
router.get(
  "/get-current-user",
  asyncHandler(AdminController.getCurrentUser.bind(AdminController))
);

/** CHAT GROUPS **/
router.get(
  "/chat-groups",
  asyncHandler(AdminController.getChatgroups.bind(AdminController))
);

/** MEMORIES **/
router.get(
  "/memories/:id?",
  asyncHandler(AdminController.getMemories.bind(AdminController))
);
router.delete(
  "/memories/:id",
  asyncHandler(AdminController.deleteMemory.bind(AdminController))
);

/** STAMPS **/
router.get(
  "/stamps",
  asyncHandler(AdminController.getStamps.bind(AdminController))
);

/** USERS **/
router.get(
  "/users/:id?",
  asyncHandler(AdminController.getUsers.bind(AdminController))
);
router.post(
  "/users",
  asyncHandler(AdminController.createUsers.bind(AdminController))
);
router.put(
  "/users/:id",
  asyncHandler(AdminController.updateUsers.bind(AdminController))
);
router.delete(
  "/users/:id",
  asyncHandler(AdminController.deleteUsers.bind(AdminController))
);

/** USERS — UPDATE STATUS */
router.patch(
  "/users/:id/status",
  asyncHandler(AdminController.updateUserStatus.bind(AdminController))
);

/** POSTS CRUD **/
router.get(
  "/posts/:id?",
  asyncHandler(AdminController.getPosts.bind(AdminController))
);
router.post(
  "/posts",
  asyncHandler(AdminController.createPost.bind(AdminController))
);
router.put(
  "/posts/:id",
  asyncHandler(AdminController.updatePost.bind(AdminController))
);
router.delete(
  "/posts/:id",
  asyncHandler(AdminController.deletePost.bind(AdminController))
);

/** ⭐ ADMIN — UPDATE POST STATUS ⭐ */
router.patch(
  "/posts/:id/status",
  asyncHandler(AdminController.updatePostStatus.bind(AdminController))
);

/** REELS CRUD **/
router.get(
  "/reels/:id?",
  asyncHandler(AdminController.getReels.bind(AdminController))
);
router.post(
  "/reels",
  asyncHandler(AdminController.createReel.bind(AdminController))
);
router.put(
  "/reels/:id",
  asyncHandler(AdminController.updateReel.bind(AdminController))
);
router.delete(
  "/reels/:id",
  asyncHandler(AdminController.deleteReel.bind(AdminController))
);

/** REELS — UPDATE STATUS */
router.patch(
  "/reels/:id/status",
  asyncHandler(AdminController.updateReelStatus.bind(AdminController))
);

/** BUCKETS **/
router.get(
  "/buckets/:id?",
  asyncHandler(AdminController.getBuckets.bind(AdminController))
);
router.post(
  "/buckets",
  asyncHandler(AdminController.createBuckets.bind(AdminController))
);
router.put(
  "/buckets/:id",
  asyncHandler(AdminController.updateBuckets.bind(AdminController))
);
router.delete(
  "/buckets/:id",
  asyncHandler(AdminController.deleteBuckets.bind(AdminController))
);

/** LOCATIONS **/
router.get(
  "/locations/:id?",
  asyncHandler(AdminController.getLocations.bind(AdminController))
);
router.delete(
  "/locations/:id",
  asyncHandler(AdminController.deleteLocations.bind(AdminController))
);

/** ITINERARIES **/
router.get(
  "/itineraries/:id?",
  asyncHandler(AdminController.getItineraries.bind(AdminController))
);
router.post(
  "/itineraries",
  asyncHandler(AdminController.createItinerary.bind(AdminController))
);
router.put(
  "/itineraries/:id",
  asyncHandler(AdminController.updateItinerary.bind(AdminController))
);
router.delete(
  "/itineraries/:id",
  asyncHandler(AdminController.deleteItinerary.bind(AdminController))
);

/** LOCATION REVIEWS **/
router.get(
  "/location-reviews/:id?",
  asyncHandler(AdminController.getLocationReviews.bind(AdminController))
);
router.put(
  "/location-reviews/:id",
  asyncHandler(AdminController.updateLocationReviews.bind(AdminController))
);
router.delete(
  "/location-reviews/:id",
  asyncHandler(AdminController.deleteLocationReviews.bind(AdminController))
);

/** AI CHAT **/
router.get(
  "/ai-chat/messages/:id?",
  asyncHandler(AdminController.getAiChatMessages.bind(AdminController))
);

/** FRIENDS **/
router.get(
  "/friends",
  asyncHandler(AdminController.getFollowers.bind(AdminController))
);

/** ADMIN MODEL CRUD **/
router
  .route("/:id?")
  .get(asyncHandler(AdminController.get.bind(AdminController)))
  .post(asyncHandler(AdminController.create.bind(AdminController)))
  .put(asyncHandler(AdminController.update.bind(AdminController)))
  .delete(asyncHandler(AdminController.deleteDoc.bind(AdminController)));

export default router;
