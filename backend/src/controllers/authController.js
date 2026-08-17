const authService = require("../services/authService");

exports.signupController = async (req, res) => {
  try {
    const result = await authService.signup(req.body);
    console.log("Signup result:", result);
    return res.status(201).json({
      message: "Signup successful. Please verify your email.",
      user: result.user,
      expiresInSeconds: result.expiresInSeconds,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message || "Signup failed",
    });
  }
};

exports.resendVerificationOtpController = async (req, res) => {
  try {
    const result = await authService.resendVerificationOtp(req.body);

    return res.status(200).json({
      message: result.message,
      expiresInSeconds: result.expiresInSeconds,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message || "Resend OTP failed",
    });
  }
};

exports.verifyEmailController = async (req, res) => {
  try {
    await authService.verifyEmail(req.body);

    return res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message || "Email verification failed",
    });
  }
};

exports.signinController = async (req, res) => {
  try {
    const result = await authService.signin(req.body);

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Signed in successfully",
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message || "Signin failed",
    });
  }
};

exports.refreshTokenController = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    const accessToken = await authService.refresh(refreshToken);

    return res.status(200).json({ accessToken });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message || "Refresh failed",
    });
  }
};

exports.logoutController = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    await authService.logout(refreshToken);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Logout failed",
    });
  }
};

exports.forgotPasswordController = async (req, res) => {
  try {
    await authService.forgotPassword(req.body.email);

    return res.status(200).json({
      message: "If an account with this email exists, a reset link/OTP has been sent.",
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message || "Forgot password failed",
    });
  }
};

exports.resetPasswordController = async (req, res) => {
  try {
    await authService.resetPassword(req.body);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return res.status(200).json({
      message: "Password reset successful. Please sign in again.",
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message || "Reset password failed",
    });
  }
};