import express from "express";
import asyncHandler from "#utils/asyncHandler";
import MessageController from "#controllers/message";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(MessageController.get.bind(MessageController)))
  .post(asyncHandler(MessageController.create.bind(MessageController)))
  .put(asyncHandler(MessageController.update.bind(MessageController)))
  .delete(asyncHandler(MessageController.deleteDoc.bind(MessageController)));

export default router;
