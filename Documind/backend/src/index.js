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


const PORT = 5000;
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
  "http://localhost:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
})); 

// app.use(cors({
//   origin: "http://localhost:5173",
//   credentials: true,
// }));

app.use(cookieParser());

app.use(express.json());

app.use("/api/auth", require("./routes/auth.js"));

app.get("/me", authMiddleware, (req, res) => {
  res.json({ message: "You are authenticated", userId: req.userId });
});
app.use("/api/news", newsRoutes);

app.use(authMiddleware);

app.get("/", (req, res) => res.json({ message: "DocuMind backend running 🚀" }));
app.use("/api/document", require("./routes/document.js"));
app.use("/api/chat", require("./routes/chat.js"));
app.use("/api/youtube", require("./routes/youtube.js"));
app.use("/api/website", require("./routes/website.js"));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));