import express from "express";
import { AuthController } from "../controllers/auth.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = express.Router();
import { VisitController } from "../controllers/visits.controller";
const visitController = new VisitController();
router.use(verifyToken);
router.get("/daily-routes", visitController.getDailyRouteAdmin)
export default router;
