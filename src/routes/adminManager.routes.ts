import express from "express";
import { AuthController } from "../controllers/auth.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = express.Router();
import { VisitController } from "../controllers/visits.controller";
import { UserTeamController } from "../controllers/user.controller";
const visitController = new VisitController();
const userController = new UserTeamController()
router.use(verifyToken);
router.get("/daily-routes", visitController.getDailyRouteAdmin)
router.get("/visit/history", visitController.getAllVisits)
router.get("/rep-manager", userController.getSalesRepManagaerList)

export default router;
