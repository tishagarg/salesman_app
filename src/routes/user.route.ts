import { Router } from "express";
import { UserTeamController } from "../controllers/user.controller";
import { verifyToken } from "../middleware/auth.middleware";

const userTeamController = new UserTeamController();
const router = Router();
router.get("/sales-rep", verifyToken, userTeamController.getSalesRep);
router.get("/unassigned-sales-rep", verifyToken, userTeamController.getUnassignedSalesRep);
router.post("/", verifyToken, userTeamController.addTeamMember);
router.get("/", verifyToken, userTeamController.getAllTeamMember);
router.get("/manager", verifyToken, userTeamController.getAllManagers);
router.get("/:id", verifyToken, userTeamController.getTeamMemberById);
router.post("/assign-manager", verifyToken, userTeamController.assignManagerToSalesRep);
router.patch("/:id", verifyToken, userTeamController.editTeamMember);
router.post("/status", verifyToken, userTeamController.activeDeactive);
router.post("/update-profile", verifyToken, userTeamController.updateProfile);
export default router;
