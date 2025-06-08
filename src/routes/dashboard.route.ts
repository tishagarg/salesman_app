import { DashboardController } from "../controllers/dashboard.controller";
import { permissionMiddleware } from "../middleware/permission.middleware";
const dashboardController = new DashboardController();
import express from "express";
const router = express.Router();
router.get(
  "/",
  permissionMiddleware("customer_import"),
  dashboardController.getDashboard
);
export default router;
