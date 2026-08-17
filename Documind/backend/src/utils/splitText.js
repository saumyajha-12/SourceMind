const splitText = (text, chunkSize = 1000, overlap = 200) => {
  if (!text || typeof text !== "string") return [];

  const cleanedText = text.replace(/\s+/g, " ").trim();
  if (!cleanedText) return [];

  const chunks = [];
  let start = 0;

  while (start < cleanedText.length) {
    const end = start + chunkSize;
    const chunk = cleanedText.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= cleanedText.length) break;

    start += chunkSize - overlap;
  }

  return chunks;
};

module.exports = splitText;