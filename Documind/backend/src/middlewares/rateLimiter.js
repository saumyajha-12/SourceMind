const rateLimit = require("express-rate-limit");

// ----------------------------
// Signup limiter
// Prevent bot account creation
// ----------------------------
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many signup attempts. Please try again later.",
  },
});


// ----------------------------
// Signin limiter
// Prevent password brute force
// ----------------------------
const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please wait 15 minutes before trying again.",
  },
});


// ----------------------------
// OTP verification limiter
// Prevent OTP brute force
// ----------------------------
const verifyOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many OTP verification attempts. Please wait before trying again.",
  },
});


// ----------------------------
// Resend OTP limiter
// Prevent email spam
// ----------------------------
const resendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many OTP resend requests. Please wait before requesting again.",
  },
});


// ----------------------------
// Forgot password limiter
// Prevent email abuse
// ----------------------------
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many password reset requests. Please try again later.",
  },
});


// ----------------------------
// Upload limiter
// Prevent file abuse
// ----------------------------
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many uploads. You can upload up to 10 files per hour.",
  },
});


// ----------------------------
// Chat message limiter
// Prevent spam
// ----------------------------
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "You're sending too many messages. Please slow down.",
  },
});


// ----------------------------
// Source processing limiter
// (YouTube / website scraping)
// ----------------------------
const sourceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many source processing requests. Please try later.",
  },
});

module.exports = {
  signupLimiter,
  signinLimiter,
  verifyOtpLimiter,
  resendOtpLimiter,
  forgotPasswordLimiter,
  uploadLimiter,
  messageLimiter,
  sourceLimiter,
};