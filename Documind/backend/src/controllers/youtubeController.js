const youtubeService = require("../services/youtubeService");

async function processYoutube(req, res) {
  try {
    const { url, chatId } = req.body;
    if (!url) {
      return res.status(400).json({ error: "YouTube URL is required" });
    }
    const result = await youtubeService.processYoutube({
      url,
      chatId,
      userId: req.userId,
    });
    return res.status(201).json({
      message: "YouTube video processed successfully",
      ...result,
    });
  } catch (err) {
    console.error("YouTube error:", err);
    const status = err.message === "Chat not found" ? 404 : 400;
    return res.status(status).json({ error: err.message });
  }
}

module.exports = { processYoutube };