const { resolveArticleLink } = require("../services/articleLinkService");

async function fetchArticleChatLink(req, res) {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Article title is required",
      });
    }

    const data = await resolveArticleLink(title);

    return res.status(200).json({
      success: true,
      message: "Article link resolved successfully",
      data,
    });
  } catch (error) {
    console.error("Error resolving article link:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to resolve article link",
      error: error.message,
    });
  }
}

module.exports = {
  fetchArticleChatLink,
};