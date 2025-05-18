import { Router } from "express";
import { UserTeamController } from "../controllers/user.controller";
import { verifyToken } from "../middleware/auth.middleware";
import { permissionMiddleware } from "../middleware/permission.middleware";
import { MessageController } from "../controllers/message.controller";
const router = Router();
const messageController = new MessageController();
router.post("/",permissionMiddleware(""),messageController.sendMessage);

export default router;

