const express = require("express");

const {
  signupLimiter,
  signinLimiter,
  verifyOtpLimiter,
  resendOtpLimiter,
  forgotPasswordLimiter,
} = require("../middlewares/rateLimiter");

const {
  signupController,
  resendVerificationOtpController,
  verifyEmailController,
  signinController,
  refreshTokenController,
  logoutController,
  forgotPasswordController,
  resetPasswordController,
} = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signupLimiter, signupController);

router.post("/resend-verification-otp", resendOtpLimiter, resendVerificationOtpController);

router.post("/verify-email", verifyOtpLimiter, verifyEmailController);

router.post("/signin", signinLimiter, signinController);

router.post("/refresh", refreshTokenController);

router.post("/logout", logoutController);

router.post("/forgot-password", forgotPasswordLimiter, forgotPasswordController);

router.post("/reset-password", forgotPasswordLimiter, resetPasswordController);

module.exports = router;
