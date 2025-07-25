import express from "express";
import asyncHandler from "#utils/asyncHandler";
import UserFollowController from "#controllers/userFollow";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/followers")
  .get(
    asyncHandler(UserFollowController.getFollowers.bind(UserFollowController)),
  );

router
  .route("/followings")
  .get(
    asyncHandler(UserFollowController.getFollowings.bind(UserFollowController)),
  );

router
  .route("/:id?")
  .get(asyncHandler(UserFollowController.get.bind(UserFollowController)))
  .post(asyncHandler(UserFollowController.create.bind(UserFollowController)))
  .put(asyncHandler(UserFollowController.update.bind(UserFollowController)))
  .delete(
    asyncHandler(UserFollowController.deleteDoc.bind(UserFollowController)),
  );

export default router;
