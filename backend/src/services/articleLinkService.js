const axios = require("axios");

const TAVILY_BASE_URL = "https://api.tavily.com/search";

function cleanArticleTitle(title) {
  return title
    .replace(/\s*-\s*[^-]+$/g, "")
    .trim();
}

async function resolveArticleLink(title, source) {
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new Error("Article title is required");
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is missing");
  }

  const cleanedTitle = cleanArticleTitle(title);
  const query = source && typeof source === "string" && source.trim()
    ? `${cleanedTitle} ${source.trim()}`
    : cleanedTitle;

  const response = await axios.post(
    TAVILY_BASE_URL,
    {
      query,
      topic: "news",
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
      include_raw_content: false
    },
    {
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  const results = response?.data?.results || [];

  if (!results.length) {
    throw new Error("No article link found");
  }

  const links = results
    .filter((r) => r.url && typeof r.url === "string" && r.url.trim())
    .map((r) => r.url);

  if (!links.length) {
    throw new Error("No valid article URL found");
  }

  return {
    links: links
  };
}

module.exports = {
  resolveArticleLink,
};