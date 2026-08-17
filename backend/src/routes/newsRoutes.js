const express = require("express");
const { fetchLatestNews } = require("../controllers/newsController");
const { fetchArticleChatLink } = require("../controllers/articleLinkController");

const router = express.Router();

router.get("/latest", fetchLatestNews);
router.post("/resolve-link", fetchArticleChatLink);

module.exports = router;