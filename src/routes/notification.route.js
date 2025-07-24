import express from "express";
import asyncHandler from "#utils/asyncHandler";
import NotificationController from "#controllers/notification";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(NotificationController.get.bind(NotificationController)))
  .post(
    asyncHandler(NotificationController.create.bind(NotificationController)),
  )
  .put(asyncHandler(NotificationController.update.bind(NotificationController)))
  .delete(
    asyncHandler(NotificationController.deleteDoc.bind(NotificationController)),
  );

export default router;
