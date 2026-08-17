const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateEmbedding(text) {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
  });

  return response.embeddings[0].values;
}

async function generateEmbeddingsBatch(texts, batchSize = 50) {
  const allEmbeddings = [];
  const totalBatches = Math.ceil(texts.length / batchSize);

  // console.log(`📊 Total chunks: ${texts.length}`);
  // console.log(`📊 Batch size: ${batchSize}`);
  // console.log(`📊 Total batches (API requests): ${totalBatches}`);

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    // console.log(`🚀 Firing batch ${batchNumber}/${totalBatches} — ${batch.length} chunks`);

    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        const response = await ai.models.embedContent({
          model: "gemini-embedding-001",
          contents: batch,
        });

        const batchEmbeddings = response.embeddings.map((e) => e.values);
        if (batchEmbeddings.length !== batch.length) {
          throw new Error("Embedding count mismatch");
        }

        allEmbeddings.push(...batchEmbeddings);
        // console.log(`✅ Batch ${batchNumber}/${totalBatches} done`);
        break;

      } catch (err) {
        lastError = err;
        if (err.status === 429) {
          // ✅ Read exact retry time from Gemini error
          const retryMatch = err.message?.match(/retry in (\d+(\.\d+)?)s/i);
          const waitSeconds = retryMatch
            ? Math.ceil(parseFloat(retryMatch[1])) + 3
            : 65;

          // console.log(`⏳ Rate limited on batch ${batchNumber} — waiting ${waitSeconds}s before retry... (${retries - 1} retries left)`);
          await new Promise((r) => setTimeout(r, waitSeconds * 1000));
          retries--;
        } else {
          throw err;
        }
      }
    }

    if (retries === 0) throw lastError;

    // ✅ Wait 15 seconds between batches
    // 60s ÷ 4 batches = 15s gap ensures we never fire more than 4 per minute
    if (i + batchSize < texts.length) {
      // console.log(`⏱️ Waiting 15s before next batch...`);
      await new Promise((r) => setTimeout(r, 15000));
    }
  }

  return allEmbeddings;
}

module.exports = { generateEmbeddingsBatch, generateEmbedding };