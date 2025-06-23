import express from "express";
import asyncHandler from "#utils/asyncHandler";
import ChatGroupMemberController from "#controllers/chatGroupMember";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/group-list")
  .get(
    asyncHandler(
      ChatGroupMemberController.getGroupList.bind(ChatGroupMemberController),
    ),
  );

router
  .route("/:id?")
  .get(
    asyncHandler(ChatGroupMemberController.get.bind(ChatGroupMemberController)),
  )
  .post(
    asyncHandler(
      ChatGroupMemberController.create.bind(ChatGroupMemberController),
    ),
  )
  .put(
    asyncHandler(
      ChatGroupMemberController.update.bind(ChatGroupMemberController),
    ),
  )
  .delete(
    asyncHandler(
      ChatGroupMemberController.deleteDoc.bind(ChatGroupMemberController),
    ),
  );

export default router;
