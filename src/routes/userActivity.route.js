import express from "express";
import asyncHandler from "#utils/asyncHandler";
import UserActivityController from "#controllers/userActivity";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// protect this endpoint (admin or authorised users)
router.use(authentication);

// GET /api/user-activity/:userId
router.get(
  "/:userId(\\d+)",
  asyncHandler(UserActivityController.getUserActivity.bind(UserActivityController)),
);

export default router;
