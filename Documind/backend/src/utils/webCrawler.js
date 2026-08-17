const axios = require("axios");
const cheerio = require("cheerio");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchPage(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: HEADERS,
    maxRedirects: 5,
  });
  return response.data;
}

function extractText($) {
  $(
    "script, style, noscript, nav, footer, header, aside, iframe, " +
      ".ad, .ads, .advertisement, .cookie, .popup, .modal, .banner, " +
      "[aria-hidden='true'], .sidebar, .menu, .navigation"
  ).remove();

  const contentSelectors = [
    "main",
    "article",
    '[role="main"]',
    ".content",
    ".post-content",
    ".article-content",
    ".entry-content",
    "#content",
    "#main",
    "#bodyContent",
    ".mw-parser-output",
    "body",
  ];

  let fullText = "";

  for (const selector of contentSelectors) {
    const el = $(selector).first();
    if (el.length) {
      fullText = el
        .find("p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, pre")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean)
        .join("\n");

      if (fullText.trim().length > 200) break;
    }
  }

  if (!fullText || fullText.trim().length < 200) {
    fullText = $("body")
      .find("p, h1, h2, h3, h4, h5, h6, li, td, blockquote")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .join("\n");
  }

  return fullText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 10)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function scrapeSinglePage(url) {
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid URL.");
  }

  let html;
  try {
    html = await fetchPage(url);
  } catch (err) {
    if (err.response?.status === 403)
      throw new Error("Website blocked access. Try a different page.");
    if (err.response?.status === 404)
      throw new Error("Page not found (404).");
    if (err.code === "ECONNREFUSED")
      throw new Error("Could not connect to the website.");
    if (err.code === "ETIMEDOUT")
      throw new Error("Website took too long to respond.");
    throw new Error(
      "Failed to fetch the page. Make sure the URL is publicly accessible."
    );
  }

  const $ = cheerio.load(html);

  const title =
    $("title").first().text().trim().replace(/\s*[-|—]\s*.*$/, "").trim() ||
    $("h1").first().text().trim() ||
    new URL(url).hostname;

  const text = extractText($);

  if (!text || text.length < 100) {
    throw new Error(
      "Could not extract meaningful content from this page. It may be JavaScript-rendered or require login."
    );
  }

  return { url, title, text };
}

module.exports = { scrapeSinglePage };