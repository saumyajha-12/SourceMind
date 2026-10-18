const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const http = require("http");
const authMiddleware = require("./middlewares/authmiddleware.js");
const path = require('path')
const fs = require('fs')
const newsRoutes = require("./routes/newsRoutes");


const PORT = process.env.PORT || 5000;
const app = express();
app.set("trust proxy", 1);

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedOrigins = [
  "https://1documind.netlify.app",
  "https://documindai.dev",
  "https://www.documindai.dev",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://source-mind-five.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

// Public health check routes (must be before authMiddleware for platform health checks)
app.get("/", (req, res) =>
  res.json({ status: "ok", message: "SourceMind backend running 🚀" })
);
app.get("/health", (req, res) =>
  res.json({ status: "ok", message: "SourceMind backend is healthy 🚀" })
);

app.use("/api/auth", require("./routes/auth.js"));
app.use("/api/news", newsRoutes);

app.get("/me", authMiddleware, (req, res) => {
  res.json({ message: "You are authenticated", userId: req.userId });
});

// Protected routes below
app.use(authMiddleware);

app.use("/api/document", require("./routes/document.js"));
app.use("/api/chat", require("./routes/chat.js"));
app.use("/api/youtube", require("./routes/youtube.js"));
app.use("/api/website", require("./routes/website.js"));

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);