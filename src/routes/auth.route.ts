import express from "express";
import { AuthController } from "../controllers/auth.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = express.Router();

let authController = new AuthController();

router.post("/register", authController.signup);

router.post("/login", authController.login);

router.post("/logout", verifyToken, authController.logout);

router.post("/verify-otp", verifyToken, authController.verifyOTP);

router.post("/resend-otp", verifyToken, authController.resendOTP);

router.post("/google", authController.google);

router.post("/forget-password", authController.forgotPassword);

router.post("/reset-password", authController.resetPassword);

router.post("/refresh-token", verifyToken, authController.refreshToken);

export default router;
