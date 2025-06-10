import express from "express";
import asyncHandler from "#utils/asyncHandler";
import AdminController from "#controllers/admin";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router
  .route("/login")
  .post(asyncHandler(AdminController.login.bind(AdminController)));

router.use(authentication);

router
  .route("/get-current-user")
  .get(asyncHandler(AdminController.getCurrentUser.bind(AdminController)));

router
  .route("/users/:id?")
  .get(asyncHandler(AdminController.getUsers.bind(AdminController)));

router
  .route("/posts/:id?")
  .get(asyncHandler(AdminController.getPosts.bind(AdminController)));

router
  .route("/:id?")
  .get(asyncHandler(AdminController.get.bind(AdminController)))
  .post(asyncHandler(AdminController.create.bind(AdminController)))
  .put(asyncHandler(AdminController.update.bind(AdminController)))
  .delete(asyncHandler(AdminController.deleteDoc.bind(AdminController)));

export default router;
