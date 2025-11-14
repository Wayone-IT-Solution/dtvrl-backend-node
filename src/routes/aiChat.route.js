import express from "express";
import asyncHandler from "#utils/asyncHandler";
import { authentication } from "#middlewares/authentication";
import AiChatController from "#controllers/aiChat";

const router = express.Router();

router.use(authentication);

router
  .route("/sessions")
  .get(asyncHandler(AiChatController.listSessions))
  .post(asyncHandler(AiChatController.createSession));

router
  .route("/sessions/:sessionId")
  .put(asyncHandler(AiChatController.updateSession));

router
  .route("/sessions/:sessionId/messages")
  .get(asyncHandler(AiChatController.getMessages))
  .post(asyncHandler(AiChatController.sendMessage));

router   // to get all saved itinerary :  "/api/itinerary",          get by id:  "/api/itinerary/1"     update : "/api/itinerary"
  .route("/messages/:messageId/save-itinerary")
  .post(asyncHandler(AiChatController.saveMessageToItinerary));

router
  .route("/messages/:messageId/itinerary")
  .delete(asyncHandler(AiChatController.deleteItineraryByMessage));

export default router;
