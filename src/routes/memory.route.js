import express from "express";
import renderMap from "#configs/olaMap";
import asyncHandler from "#utils/asyncHandler";
import MemoryController from "#controllers/memory";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

// Preview page for Ola Maps debugging
router.get("/map/preview", asyncHandler(renderMap));

// Privacy-aware map/timeline APIs
router.get(
  "/map",
  asyncHandler(MemoryController.listForMap.bind(MemoryController)),
);

router.get(
  "/timeline",
  asyncHandler(MemoryController.listForTimeline.bind(MemoryController)),
);

// User-specific listing
router.get(
  "/user/:userId(\\d+)",
  asyncHandler(MemoryController.listByUser.bind(MemoryController)),
);

// Admin/all access passthrough
router.get(
  "/all/:id?",
  asyncHandler(MemoryController.getMemories.bind(MemoryController)),
);

// Update privacy only
router.patch(
  "/privacy/:id(\\d+)",
  asyncHandler(MemoryController.updatePrivacy.bind(MemoryController)),
);

// Default CRUD
router
  .route("/")
  .get(asyncHandler(MemoryController.get.bind(MemoryController)))
  .post(asyncHandler(MemoryController.create.bind(MemoryController)));

router
  .route("/:id(\\d+)")
  .get(asyncHandler(MemoryController.getOne.bind(MemoryController)))
  .put(asyncHandler(MemoryController.update.bind(MemoryController)))
  .delete(asyncHandler(MemoryController.deleteDoc.bind(MemoryController)));

export default router;
