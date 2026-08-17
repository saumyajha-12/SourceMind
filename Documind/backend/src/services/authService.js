const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const { generateAccessToken, generateRefreshToken } = require("../utils/token");
const { generateOTP } = require("../utils/otp");
const {
  sendVerificationEmail,
  sendResetPasswordEmail,
} = require("../utils/sendEmail");

const OTP_EXPIRY_MINUTES = 10;
const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000;

exports.signup = async ({ email, password }) => {
  if (!email || !password) {
    throw { status: 400, message: "Email and password are required" };
  }
  console.log("Signup request received for email:", email);
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw { status: 409, message: "User already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  console.log(`Generated OTP for ${email}: ${otp} (expires at ${expiresAt.toISOString()})`);
  await prisma.emailVerificationToken.deleteMany({
    where: { userId: user.id },
  });

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token: otp,
      expiresAt,
    },
  });

  await sendVerificationEmail(user.email, otp);

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    expiresInSeconds: OTP_EXPIRY_MS / 1000,
    expiresAt: expiresAt.toISOString(),
  };
};

exports.resendVerificationOtp = async ({ email }) => {
  if (!email) {
    throw { status: 400, message: "Email is required" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw { status: 404, message: "User not found" };
  }

  if (user.isEmailVerified) {
    throw { status: 400, message: "Email is already verified" };
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await prisma.emailVerificationToken.deleteMany({
    where: { userId: user.id },
  });

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token: otp,
      expiresAt,
    },
  });

  await sendVerificationEmail(user.email, otp);

  return {
    message: "A new OTP has been sent to your email",
    expiresInSeconds: OTP_EXPIRY_MS / 1000,
    expiresAt: expiresAt.toISOString(),
  };
};

exports.verifyEmail = async ({ email, otp }) => {
  if (!email || !otp) {
    throw { status: 400, message: "Email and OTP are required" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw { status: 404, message: "User not found" };
  }

  const tokenRecord = await prisma.emailVerificationToken.findFirst({
    where: {
      userId: user.id,
      token: otp,
    },
  });

  if (!tokenRecord) {
    throw { status: 400, message: "Invalid OTP" };
  }

  if (tokenRecord.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({
      where: { id: tokenRecord.id },
    });

    throw { status: 400, message: "OTP expired" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
    },
  });

  await prisma.emailVerificationToken.delete({
    where: { id: tokenRecord.id },
  });
};

exports.signin = async ({ email, password }) => {
  if (!email || !password) {
    throw { status: 400, message: "Email and password are required" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw { status: 401, message: "Invalid credentials" };
  }

  if (!user.isEmailVerified) {
    throw { status: 403, message: "Please verify your email first" };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw { status: 401, message: "Invalid credentials" };
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
    },
  };
};

exports.refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw { status: 401, message: "Refresh token missing" };
  }

  let decoded;

  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw { status: 401, message: "Invalid or expired refresh token" };
  }

  const session = await prisma.session.findFirst({
    where: { refreshToken },
  });

  if (!session) {
    throw { status: 401, message: "Session not found" };
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({
      where: { id: session.id },
    });

    throw { status: 401, message: "Session expired. Please sign in again" };
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user) {
    await prisma.session.delete({
      where: { id: session.id },
    });

    throw { status: 404, message: "User not found" };
  }

  return generateAccessToken(user);
};

exports.logout = async (refreshToken) => {
  if (!refreshToken) return;

  await prisma.session.deleteMany({
    where: { refreshToken },
  });
};

exports.forgotPassword = async (email) => {
  if (!email) {
    throw { status: 400, message: "Email is required" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return;
  }

  const otp = generateOTP();

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await sendResetPasswordEmail(user.email, otp);
};

exports.resetPassword = async ({ email, token, newPassword }) => {
  if (!email || !token || !newPassword) {
    throw {
      status: 400,
      message: "Email, token and newPassword are required",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw { status: 404, message: "User not found" };
  }

  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      token,
    },
  });

  if (!resetRecord) {
    throw { status: 400, message: "Invalid reset token" };
  }

  if (resetRecord.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({
      where: { id: resetRecord.id },
    });

    throw { status: 400, message: "Reset token expired" };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
    },
  });

  await prisma.passwordResetToken.delete({
    where: { id: resetRecord.id },
  });

  await prisma.session.deleteMany({
    where: { userId: user.id },
  });
};