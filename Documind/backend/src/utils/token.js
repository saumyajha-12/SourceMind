const jwt = require("jsonwebtoken");

exports.generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

exports.generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};