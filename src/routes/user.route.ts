import { Router } from "express";
import { UserTeamController } from "../controllers/user.controller";
import { verifyToken } from "../middleware/auth.middleware";

const userTeamController = new UserTeamController();
const router = Router();

router.post("/", verifyToken, userTeamController.addTeamMember);

router.get("/", verifyToken, userTeamController.getAllTeamMember);

router.get("/:id", verifyToken, userTeamController.getTeamMemberById);

router.patch("/:id", verifyToken, userTeamController.editTeamMember);

router.post("/status", verifyToken, userTeamController.activeDeactive);
router.post("/update-profile", verifyToken, userTeamController.updateProfile);
// router.get("/managers", verifyToken, verifyAdmin, userTeamController.getAllManagers);
export default router;
