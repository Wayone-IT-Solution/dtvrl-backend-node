import express from "express";
import asyncHandler from "#utils/asyncHandler";
import MemoryController from "#controllers/memory";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(MemoryController.get.bind(MemoryController)))
  .post(asyncHandler(MemoryController.create.bind(MemoryController)))
  .put(asyncHandler(MemoryController.update.bind(MemoryController)))
  .delete(asyncHandler(MemoryController.deleteDoc.bind(MemoryController)));

export default router;
