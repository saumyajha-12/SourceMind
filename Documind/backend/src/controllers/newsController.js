const { getLatestNewsByTopic } = require("../services/newsService");

async function fetchLatestNews(req, res) {
  try {
    const { topic } = req.query;

    if (!topic || !topic.trim()) {
      return res.status(400).json({
        success: false,
        message: "topic query parameter is required",
      });
    }

    const data = await getLatestNewsByTopic(topic);

    return res.status(200).json({
      success: true,
      message: "Latest news fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Error fetching latest news:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch latest news",
      error: error.message,
    });
  }
}

module.exports = {
  fetchLatestNews,
};