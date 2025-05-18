import { VisitController } from "../controllers/visits.controller";
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

export default router;
