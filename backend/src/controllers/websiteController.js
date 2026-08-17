const websiteService = require("../services/websiteService");

async function processWebsite(req, res) {
  try {
    const { url, chatId } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Website URL is required" });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format." });
    }

    const result = await websiteService.processWebsite({
      url,
      chatId,
      userId: req.userId,
      maxPages: 10,
    });

    return res.status(201).json({
      message: `Website crawled successfully — ${result.pagesScraped} pages processed`,
      ...result,
    });
  } catch (err) {
    console.error("Website error:", err);
    const status = err.message === "Chat not found" ? 404 : 400;
    return res.status(status).json({ error: err.message });
  }
}

module.exports = { processWebsite };