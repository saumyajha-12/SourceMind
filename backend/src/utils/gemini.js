const { GoogleGenAI } = require("@google/genai");

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is not set in environment variables!");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Models ordered by speed / latency:
// gemini-3.5-flash-lite: Built for low latency, instant streaming
// gemini-3.8-flash: Flagship Flash model
// gemini-2.5-flash: Stable fallback
const FREE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-2.5-flash",
];

// Configuration to disable internal thinking delay (0 = instant response)
const FAST_CONFIG = {
  thinkingConfig: {
    thinkingBudget: 0,
  },
};

async function generateResponse(prompt) {
  let lastError;

  for (const model of FREE_MODELS) {
    try {
      console.log(`🤖 Trying model: ${model}`);
      let response;
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: FAST_CONFIG,
        });
      } catch (configErr) {
        // Fallback without thinkingConfig if unsupported by the specific model
        response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
      }
      console.log(`✅ Model ${model} succeeded`);
      return response.text;
    } catch (err) {
      console.warn(`❌ Model ${model} failed: ${err.status || ""} ${err.message}`);
      lastError = err;
      if (err.status === 401 || err.status === 403) {
        throw new Error("Gemini API authentication failed. Please check your GEMINI_API_KEY.");
      }
    }
  }

  throw new Error(`All AI models failed. Last error: ${lastError?.message}`);
}

/**
 * Stream a Gemini response with lowest possible latency.
 * Calls `onChunk(textPiece)` for each token as it arrives.
 */
async function generateResponseStream(prompt, onChunk) {
  let lastError;

  for (const model of FREE_MODELS) {
    try {
      console.log(`🤖 Trying model (stream): ${model}`);
      let response;
      try {
        response = await ai.models.generateContentStream({
          model,
          contents: prompt,
          config: FAST_CONFIG,
        });
      } catch (configErr) {
        console.warn(`ThinkingConfig not supported for ${model}, retrying standard: ${configErr.message}`);
        response = await ai.models.generateContentStream({
          model,
          contents: prompt,
        });
      }

      let fullText = "";
      for await (const chunk of response) {
        const piece = chunk.text || "";
        if (piece) {
          fullText += piece;
          onChunk(piece);
        }
      }

      console.log(`✅ Model ${model} stream succeeded`);
      return fullText;
    } catch (err) {
      console.warn(`❌ Model ${model} stream failed: ${err.status || ""} ${err.message}`);
      lastError = err;
      if (err.status === 401 || err.status === 403) {
        throw new Error("Gemini API authentication failed. Please check your GEMINI_API_KEY.");
      }
    }
  }

  throw new Error(`All AI models failed. Last error: ${lastError?.message}`);
}

module.exports = { generateResponse, generateResponseStream };
