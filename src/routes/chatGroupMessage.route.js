import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ChatGroupMessageController from "#controllers/chatGroupMessage";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(ChatGroupMessageController.get.bind(ChatGroupMessageController)))
  .post(asyncHandler(ChatGroupMessageController.create.bind(ChatGroupMessageController)))
  .put(asyncHandler(ChatGroupMessageController.update.bind(ChatGroupMessageController)))
  .delete(asyncHandler(ChatGroupMessageController.deleteDoc.bind(ChatGroupMessageController)));

export default router;
