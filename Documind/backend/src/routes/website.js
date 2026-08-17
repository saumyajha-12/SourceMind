const express = require("express");
const { processWebsite } = require("../controllers/websiteController");
const { sourceLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

router.post("/process", sourceLimiter, processWebsite); // ✅

module.exports = router;