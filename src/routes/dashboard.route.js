// src/routes/admin/dashboard.route.js
import { Router } from "express";
import AdminDashboardController from "#controllers/dashboard";
import asyncHandler from "#middlewares/asyncHandler";
import adminAuth from "#middlewares/adminAuth"; // If you have admin auth middleware

const router = Router();

// GET /admin/dashboard/overview
router.get(
  "/",
//   adminAuth,                       // <-- remove this if not using admin auth
  asyncHandler(AdminDashboardController.getOverview)
);

export default router;
