import { VisitController } from "../controllers/visits.controller";
import { verifyToken } from "../middleware/auth.middleware";
import multer from "multer";
import { permissionMiddleware } from "../middleware/permission.middleware";
const visitController = new VisitController();
import express from "express";
import { upload } from "../aws/aws.service";
const router = express.Router();
router.get(
  "/plan",
  verifyToken,
  // permissionMiddleware("customer_import"),
  visitController.planVisit
);
router.post(
  "/log",
  verifyToken,
 upload.array("photos"),
  // permissionMiddleware("customer_import"),
  visitController.logVisit
);
router.get("/past-vists", verifyToken, visitController.getPastVisits);
router.get("/route/daily", verifyToken, visitController.getDailyRoute);
router.get("/route/refresh", verifyToken, visitController.refreshDailyRoute);
export default router;
