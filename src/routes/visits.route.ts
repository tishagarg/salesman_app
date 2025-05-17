import { VisitController } from "../controllers/visits.controller";
import { roleMiddleware } from "../middleware/role.middleware";
const visitController = new VisitController();
import express from "express";
const router = express.Router();
router.post(
  "/plan",
  roleMiddleware(["manager"]),
  visitController.planVisit
);
router.post(
  "/log",
  roleMiddleware(["sales rep"]),
  visitController.logVisit
);

export default router;