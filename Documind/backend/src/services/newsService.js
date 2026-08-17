const Parser = require("rss-parser");

const parser = new Parser();

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/\s*-\s*[^-]+$/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTitleTokens(title) {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "between", "into", "over", "after", "before",
    "under", "about", "is", "are", "was", "were", "be", "been", "being",
    "this", "that", "these", "those"
  ]);

  return normalizeTitle(title)
    .split(" ")
    .filter((word) => word && !stopWords.has(word));
}

function jaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size;

  return union === 0 ? 0 : intersection / union;
}

function isSameNews(titleA, titleB) {
  const tokensA = getTitleTokens(titleA);
  const tokensB = getTitleTokens(titleB);

  const similarity = jaccardSimilarity(tokensA, tokensB);

  if (similarity >= 0.5) return true;

  const commonTokens = tokensA.filter((token) => tokensB.includes(token));
  const commonNumbers = commonTokens.filter((token) => /^\d+$/.test(token));

  const hasStrongKeywordOverlap =
    commonTokens.length >= 3 || commonNumbers.length >= 1;

  return hasStrongKeywordOverlap && similarity >= 0.35;
}

function dedupeArticles(articles) {
  const uniqueArticles = [];

  for (const article of articles) {
    const duplicateFound = uniqueArticles.some((savedArticle) =>
      isSameNews(article.title, savedArticle.title)
    );

    if (!duplicateFound) {
      uniqueArticles.push(article);
    }
  }

  return uniqueArticles;
}

async function getLatestNewsByTopic(topic) {
  if (!topic || typeof topic !== "string" || !topic.trim()) {
    throw new Error("Topic is required");
  }

  const cleanedTopic = topic.trim();
  const encodedTopic = encodeURIComponent(cleanedTopic);

  const rssUrl = `https://news.google.com/rss/search?q=${encodedTopic}&hl=en-IN&gl=IN&ceid=IN:en`;

  const feed = await parser.parseURL(rssUrl);

  let articles = (feed.items || []).map((item) => ({
    title: item.title || "",
    googleNewsLink: item.link || "",
    pubDate: item.pubDate || "",
    source:
      item.source && typeof item.source === "object"
        ? item.source.title || "Unknown"
        : item.source || "Unknown",
    contentSnippet: item.contentSnippet || "",
  }));

  const cutoffTime = Date.now() - 3 * 60 * 60 * 1000;

  articles = articles.filter((article) => {
    const publishedTime = new Date(article.pubDate).getTime();
    return !Number.isNaN(publishedTime) && publishedTime <= cutoffTime;
  });

  articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  articles = dedupeArticles(articles);

  articles = articles.slice(0, 10).map((article, index) => ({
    id: index + 1,
    ...article,
  }));

  return {
    topic: cleanedTopic,
    total: articles.length,
    articles,
  };
}

module.exports = {
  getLatestNewsByTopic,
};