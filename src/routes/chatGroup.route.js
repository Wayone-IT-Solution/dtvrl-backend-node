import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ChatGroupController from "#controllers/chatGroup";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(ChatGroupController.get.bind(ChatGroupController)))
  .post(asyncHandler(ChatGroupController.create.bind(ChatGroupController)))
  .put(asyncHandler(ChatGroupController.update.bind(ChatGroupController)))
  .delete(asyncHandler(ChatGroupController.deleteDoc.bind(ChatGroupController)));

export default router;
