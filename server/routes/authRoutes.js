import { Router } from "express";

import {
  login,
  logout,
  me,
  register,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationCode,
} from "../controllers/authController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);

authRouter.get("/me", authMiddleware, me);

// Email Verification
authRouter.post("/verify-email", verifyEmail);
authRouter.post("/resend-verification", resendVerificationCode);

// Password Reset
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password/:token", resetPassword);

export default authRouter;
