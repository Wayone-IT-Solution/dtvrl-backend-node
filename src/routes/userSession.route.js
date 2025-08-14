import express from "express";
import asyncHandler from "#utils/asyncHandler";
import UserSessionController from "#controllers/userSession";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(UserSessionController.get.bind(UserSessionController)))
  .post(asyncHandler(UserSessionController.create.bind(UserSessionController)))
  .put(asyncHandler(UserSessionController.update.bind(UserSessionController)))
  .delete(asyncHandler(UserSessionController.deleteDoc.bind(UserSessionController)));

export default router;
