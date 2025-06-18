import express from "express";
import renderMap from "#configs/olaMap";
import asyncHandler from "#utils/asyncHandler";
import MemoryController from "#controllers/memory";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router.route("/map").get(asyncHandler(renderMap));

router
  .route("/all/:id?")
  .get(asyncHandler(MemoryController.getMemories.bind(MemoryController)));

router
  .route("/:id?")
  .get(asyncHandler(MemoryController.get.bind(MemoryController)))
  .post(asyncHandler(MemoryController.create.bind(MemoryController)))
  .put(asyncHandler(MemoryController.update.bind(MemoryController)))
  .delete(asyncHandler(MemoryController.deleteDoc.bind(MemoryController)));

export default router;
