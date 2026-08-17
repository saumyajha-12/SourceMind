const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Authorization header missing" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Access token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.userId;
    req.user = decoded;

    next();
  } catch (error) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Invalid or expired access token" });
  }
};

module.exports = authMiddleware;