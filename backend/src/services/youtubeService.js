const { PrismaClient } = require("../generated/prisma");
const { getYoutubeTranscript } = require("../utils/youtubeTranscript");
const splitText = require("../utils/splitText");
const { generateEmbeddingsBatch } = require("../utils/embedding");

const prisma = new PrismaClient();

async function processYoutube({ url, chatId, userId }) {
  const originalChatId = chatId; // ✅ save before potentially creating new

  let fullText, videoId, title;
  try {
    ({ fullText, videoId, title } = await getYoutubeTranscript(url));
  } catch (err) {
    throw new Error(err.message);
  }

  // ✅ Word count limit
  const wordCount = fullText.trim().split(/\s+/).length;
  if (wordCount > 50000) {
    throw new Error(
      "This video is too long. Please use a shorter video (max ~6 hours)."
    );
  }

  let chat;
  if (chatId) {
    chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) throw new Error("Chat not found");
  } else {
    chat = await prisma.chat.create({ data: { userId } });
    chatId = chat.id;
  }

  const document = await prisma.document.create({
    data: {
      filename: title,
      path: `youtube:${videoId}`,
      userId,
      chatId,
    },
  });

  const chunks = splitText(fullText, 1000, 200);

  const metadataChunk = `[Source: ${title}]\nVideo Title: ${title}\nVideo ID: ${videoId}\nThis is a YouTube video transcript.`;
  const allChunks = [
    metadataChunk,
    ...chunks.map((c) => `[Source: ${title}]\n${c}`),
  ];

  try {
    const embeddings = await generateEmbeddingsBatch(
      allChunks,
      Number(process.env.BATCH_SIZE) || 50
    );

    for (let i = 0; i < allChunks.length; i++) {
      const chunk = await prisma.chunk.create({
        data: {
          content: allChunks[i],
          documentId: document.id,
          chatId,
        },
      });

      const vectorString = `[${embeddings[i].join(",")}]`;
      await prisma.$executeRaw`
        UPDATE "Chunk"
        SET embedding = CAST(${vectorString} AS vector)
        WHERE id = ${chunk.id}
      `;
    }
  } catch (embeddingError) {
    // ✅ Full cleanup
    await prisma.chunk.deleteMany({ where: { documentId: document.id } });
    await prisma.document.delete({ where: { id: document.id } });
    if (!originalChatId) {
      await prisma.chat.delete({ where: { id: chat.id } });
    }
    console.error("Embedding error:", embeddingError);
    throw new Error("Failed to process video transcript embeddings. Please try again.");
  }

  return {
    chatId: chat.id,
    documentId: document.id,
    filename: title,
    videoId,
    chunksCount: allChunks.length,
  };
}

module.exports = { processYoutube };