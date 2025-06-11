import express from "express";
import asyncHandler from "#utils/asyncHandler";
import PostViewController from "#controllers/postView";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .post(asyncHandler(PostViewController.create.bind(PostViewController)));

export default router;
