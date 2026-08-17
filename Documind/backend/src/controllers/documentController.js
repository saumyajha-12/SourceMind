const fs = require("fs");
const documentService = require("../services/documentService.js");

async function upload(req, res) {
  try {
    const result = await documentService.uploadPdf({
      file: req.file,
      chatId: req.body.chatId,
      userId: req.userId,
    });
    return res.status(201).json({
      message: "File uploaded and processed successfully",
      ...result,
    });
  } catch (err) {
    console.error("Upload error:", err);
    const status = err.message === "Chat not found" ? 404 : 500;
    return res.status(status).json({ error: err.message });
  }
}

async function viewDocument(req, res) {
  try {
    const { filePath, filename } = await documentService.getDocumentFile({
      documentId: req.params.documentId,
      userId: req.userId,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error("View error:", err);
    const status = err.message.includes("not found") ? 404 : 500;
    return res.status(status).json({ error: err.message });
  }
}

module.exports = { upload, viewDocument };