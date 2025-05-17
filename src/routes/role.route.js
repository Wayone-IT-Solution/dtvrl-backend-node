import express from "express";
import asyncHandler from "#utils/asyncHandler";
import RoleController from "#controllers/role";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(RoleController.get.bind(RoleController)))
  .post(asyncHandler(RoleController.create.bind(RoleController)))
  .put(asyncHandler(RoleController.update.bind(RoleController)))
  .delete(asyncHandler(RoleController.deleteDoc.bind(RoleController)));

export default router;
