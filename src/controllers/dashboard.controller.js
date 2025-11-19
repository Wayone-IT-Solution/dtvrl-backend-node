// src/controllers/admin/dashboard.controller.js
import DashboardService from "#services/dashboard";

class AdminDashboardController {
  static async getOverview(req, res, next) {
    try {
      const {
        startDate,
        endDate,
        granularity,
        tz,
        page,
        limit,
        modules, // comma-separated string
      } = req.query;

      const parsedModules = modules
        ? modules.split(",").map((x) => x.trim()).filter(Boolean)
        : null;

      const result = await DashboardService.getOverview({
        startDate,
        endDate,
        granularity,
        tz: tz || "UTC",
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        modules: parsedModules,
        requestingUser: req.user, // for admin check if needed
      });

      return res.status(200).json({
        success: true,
        message: "Dashboard overview fetched successfully",
        data: result,
      });
    } catch (error) {
      console.error("Dashboard getOverview Error:", error);
      next(error);
    }
  }
}

export default AdminDashboardController;
