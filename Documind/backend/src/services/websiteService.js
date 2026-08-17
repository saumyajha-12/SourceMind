const { PrismaClient } = require("../generated/prisma");
const { scrapeSinglePage } = require("../utils/webCrawler");
const splitText = require("../utils/splitText");
const { generateEmbeddingsBatch } = require("../utils/embedding");

const prisma = new PrismaClient();

async function processWebsite({ url, chatId, userId }) {
  const originalChatId = chatId; // ✅ save before potentially creating new

  let page;
  try {
    page = await scrapeSinglePage(url);
  } catch (err) {
    throw new Error(err.message);
  }

  if (!page || !page.text) {
    throw new Error(
      "Could not extract any content from this page. It may require login or be JavaScript-rendered."
    );
  }

  // ✅ Word count limit
  const wordCount = page.text.trim().split(/\s+/).length;
  if (wordCount > 50000) {
    throw new Error(
      "This page has too much content. Please try a more specific page."
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
      filename: page.title,
      path: `web:${page.url}`,
      userId,
      chatId,
    },
  });

  const chunks = splitText(page.text, 1000, 200);

  const metadataChunk = `[Source: ${page.title}]\nPage Title: ${page.title}\nPage URL: ${page.url}\nThis content is from a website page.`;
  const allChunks = [
    metadataChunk,
    ...chunks.map((c) => `[Source: ${page.title}]\n${c}`),
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
    throw new Error("Failed to process page embeddings. Please try again.");
  }

  return {
    chatId: chat.id,
    documentId: document.id,
    filename: page.title,
    url: page.url,
    pagesScraped: 1,
  };
}

module.exports = { processWebsite };