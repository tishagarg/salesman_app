import { Router } from "express";
import { UserTeamController } from "../controllers/user.controller";
import { verifyToken } from "../middleware/auth.middleware";
import { roleMiddleware } from "../middleware/role.middleware";
import { MessageController } from "../controllers/message.controller";
const router = Router();
const messageController = new MessageController();
router.post("/",roleMiddleware(["sales rep", "manager"]),messageController.sendMessage);

export default router;

