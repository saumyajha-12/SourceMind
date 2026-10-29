const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const chatService = require("../services/chatService");
const fs = require("fs");
const path = require("path");

async function getHistory(req, res) {
  try {
    const chats = await chatService.getChatHistory(req.userId);
    return res.status(200).json({ chats });
  } catch (err) {
    console.error("History error:", err);
    return res.status(500).json({ error: "Failed to fetch chat history" });
  }
}

async function getMessages(req, res) {
  try {
    const messages = await chatService.getChatMessages(
      req.params.chatId,
      req.userId
    );
    return res.status(200).json({ messages });
  } catch (err) {
    console.error("Messages error:", err);
    const status = err.message === "Chat not found" ? 404 : 500;
    return res.status(status).json({ error: err.message });
  }
}

async function sendMessage(req, res) {
  try {
    const { chatId, message } = req.body;
    if (!chatId || !message) {
      return res.status(400).json({ error: "chatId and message are required" });
    }
    const reply = await chatService.sendMessage({
      chatId,
      message,
      userId: req.userId,
    });
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Send message error:", err);
    const status = err.message === "Chat not found" ? 404 : 500;
    return res.status(status).json({ error: err.message });
  }
}

/**
 * SSE streaming endpoint — sends tokens as they arrive from Gemini
 */
async function sendMessageStream(req, res) {
  const { chatId, message } = req.body;
  if (!chatId || !message) {
    return res.status(400).json({ error: "chatId and message are required" });
  }

  // Set up SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disable nginx buffering (for Render/proxies)
  });

  // Handle client disconnect
  let clientDisconnected = false;
  req.on("close", () => {
    clientDisconnected = true;
  });

  try {
    await chatService.sendMessageStream({
      chatId,
      message,
      userId: req.userId,
      onChunk: (text) => {
        if (!clientDisconnected) {
          // Send each chunk as an SSE "data" event (JSON-encoded)
          res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
          if (typeof res.flush === "function") res.flush();
        }
      },
    });

    // Signal completion
    if (!clientDisconnected) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (err) {
    console.error("Stream message error:", err);
    if (!clientDisconnected) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
}

async function deleteChat(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
      include: {
        documents: {
          select: { path: true }
        }
      }
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // ✅ Delete PDF files from disk
    for (const doc of chat.documents) {
      if (doc.path && !doc.path.startsWith("youtube:") && !doc.path.startsWith("web:")) {
        try {
          const filePath = path.resolve(doc.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Deleted file: ${filePath}`);
          }
        } catch (fileErr) {
          console.warn(`⚠️ Could not delete file: ${fileErr.message}`);
        }
      }
    }

    await prisma.$transaction([
      prisma.chunk.deleteMany({ where: { chatId } }),
      prisma.message.deleteMany({ where: { chatId } }),
      prisma.document.deleteMany({ where: { chatId } }),
      prisma.chat.delete({ where: { id: chatId } }),
    ]);

    return res.status(200).json({ message: "Chat deleted successfully" });
  } catch (err) {
    console.error("Delete chat error:", err);
    return res.status(500).json({ error: "Failed to delete chat" });
  }
}

module.exports = { getHistory, getMessages, sendMessage, sendMessageStream, deleteChat };
