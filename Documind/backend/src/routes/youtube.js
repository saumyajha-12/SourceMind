const express = require("express");
const { processYoutube } = require("../controllers/youtubeController");
const { sourceLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

router.post("/process", sourceLimiter, processYoutube); 

module.exports = router;