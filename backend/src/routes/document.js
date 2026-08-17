const express = require("express");
const multer = require("multer");
const { upload, viewDocument } = require("../controllers/documentController");
const { uploadLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/upload", uploadLimiter, uploadMiddleware.single("file"), upload);
router.get("/:documentId/view", viewDocument);

module.exports = router;