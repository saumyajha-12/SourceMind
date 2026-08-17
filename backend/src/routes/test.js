const express = require("express");
const router = express.Router();
const { generateResponse } = require("../utils/gemini");
const { generateEmbedding } = require("../utils/embedding");

router.get("/test-ai", async (req, res) => {
  try {
    const response = await generateResponse("Explain AI in 2 lines");
    res.json({ response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI failed" });
  }
});

router.get("/test-embedding", async (req, res) => {
  try {
    const embedding = await generateEmbedding("Hello world");
    res.json({
      length: embedding.length,
      first5: embedding.slice(0, 5),
    });
  } catch (err) {
    console.error("Embedding error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;