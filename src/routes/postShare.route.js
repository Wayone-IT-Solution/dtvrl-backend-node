import express from "express";
import asyncHandler from "#utils/asyncHandler";
import PostShareController from "#controllers/postShare";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(PostShareController.get.bind(PostShareController)))
  .post(asyncHandler(PostShareController.create.bind(PostShareController)))
  .put(asyncHandler(PostShareController.update.bind(PostShareController)))
  .delete(asyncHandler(PostShareController.deleteDoc.bind(PostShareController)));

export default router;
