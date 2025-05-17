import { DashboardController } from "../controllers/dashboard.controller";
import { roleMiddleware } from "../middleware/role.middleware";
const dashboardController = new DashboardController();
import express from "express";
const router = express.Router();
router.post(
  "/",
  roleMiddleware(["admin", "manager"]),
  dashboardController.getDashboard
);
export default router;
