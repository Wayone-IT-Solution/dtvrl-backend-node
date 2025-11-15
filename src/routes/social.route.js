import express from "express";
import asyncHandler from "#utils/asyncHandler";
import { authentication } from "#middlewares/authentication";
import UserSocialController from "#controllers/userSocial";

const router = express.Router();

router.use(authentication);

// Follow requests
router.post(
  "/user/:id(\\d+)/follow-request",
  asyncHandler(
    UserSocialController.sendFollowRequest.bind(UserSocialController),
  ),
);

router.get(
  "/follow-requests",
  asyncHandler(
    UserSocialController.listIncomingRequests.bind(UserSocialController),
  ),
);

router.get(
  "/follow-requests/sent",
  asyncHandler(
    UserSocialController.listOutgoingRequests.bind(UserSocialController),
  ),
);

router.post(
  "/follow-requests/:id(\\d+)/respond",
  asyncHandler(
    UserSocialController.respondToRequest.bind(UserSocialController),
  ),
);

// Block / unblock
router.post(
  "/user/:id(\\d+)/block",
  asyncHandler(UserSocialController.blockUser.bind(UserSocialController)),
);

router.post(
  "/user/:id(\\d+)/unblock",
  asyncHandler(UserSocialController.unblockUser.bind(UserSocialController)),
);

router.get(
  "/user/blocked",
  asyncHandler(
    UserSocialController.listBlockedUsers.bind(UserSocialController),
  ),
);

export default router;

