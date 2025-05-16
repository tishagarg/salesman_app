import { verifyToken } from "../middleware/auth.middleware";
import authRoute from "./auth.route";
import userRoute from "./user.route";

import express from "express";
const router = express.Router();
router.use("/auth", authRoute);
router.use("/user", userRoute);

export default router;
