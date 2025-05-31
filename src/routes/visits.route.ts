import { VisitController } from "../controllers/visits.controller";
import { verifyToken } from "../middleware/auth.middleware";
import { permissionMiddleware } from "../middleware/permission.middleware";
const visitController = new VisitController();
import express from "express";
const router = express.Router();
router.post(
  "/plan",
  permissionMiddleware("customer_import"),
  visitController.planVisit
);
router.post(
  "/log",
  permissionMiddleware("customer_import"),
  visitController.logVisit
);
router.get("/route/daily", verifyToken, visitController.getDailyRoute);
router.get("/route/refresh", verifyToken, visitController.refreshDailyRoute);

export default router;
