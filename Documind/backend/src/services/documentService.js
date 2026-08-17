const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("../generated/prisma");
const extractTextFromPdf = require("../utils/extractTextFromPdf");
const splitText = require("../utils/splitText");
const { generateEmbeddingsBatch } = require("../utils/embedding");

const prisma = new PrismaClient();

async function uploadPdf({ file, chatId, userId }) {
  const originalChatId = chatId; 

  const extractedText = await extractTextFromPdf(file.path);

  if (!extractedText || !extractedText.trim()) {
    throw new Error(
      "No text could be extracted from this PDF. It may be scanned or image-based."
    );
  }

  const wordCount = extractedText.trim().split(/\s+/).length;
  if (wordCount > 50000) {
    throw new Error(
      "This PDF is too large. Please upload a document with fewer than ~200 pages."
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
      filename: file.originalname,
      path: file.path,
      userId,
      chatId,
    },
  });

  const chunks = splitText(extractedText, 1000, 200);

  try {
    const embeddings = await generateEmbeddingsBatch(
      chunks,
      Number(process.env.BATCH_SIZE) || 50
    );

    for (let i = 0; i < chunks.length; i++) {
      const chunk = await prisma.chunk.create({
        data: {
          content: `[Source: ${document.filename}]\n${chunks[i]}`,
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
    await prisma.chunk.deleteMany({ where: { documentId: document.id } });
    await prisma.document.delete({ where: { id: document.id } });

    // ✅ Only delete chat if WE created it (originalChatId was null)
    if (!originalChatId) {
      await prisma.chat.delete({ where: { id: chat.id } });
    }

    console.error("Embedding error:", embeddingError);
    throw new Error("Failed to process PDF embeddings. Please try again.");
  }

  return {
    chatId: chat.id,
    documentId: document.id,
    filename: document.filename,
    textLength: extractedText.length,
    chunksCount: chunks.length,
  };
}

async function getDocumentFile({ documentId, userId }) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
  });

  if (!document) throw new Error("Document not found");

  const filePath = path.resolve(document.path);
  if (!fs.existsSync(filePath)) throw new Error("File not found on disk");

  return { filePath, filename: document.filename };
}

module.exports = { uploadPdf, getDocumentFile };