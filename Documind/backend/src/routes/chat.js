const express = require("express");
const { getHistory, getMessages, sendMessage,deleteChat } = require("../controllers/chatController");
const { messageLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

router.get("/history", getHistory);
router.get("/:chatId/messages", getMessages);
router.post("/message", messageLimiter, sendMessage);
router.delete("/:chatId", deleteChat);

module.exports = router;