import { useState } from "react";
import api from "../Api";

export function usePdfUpload({ activeChatId, onSuccess }) {
  const [uploadedPdfs, setUploadedPdfs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePdfSelect = async (file) => {
    if (!file || file.type !== "application/pdf") return;
    
    // Set processing state IMMEDIATELY
    setIsProcessing(true);
    setUploadError("");
    setUploading(true);

    const tempId = `temp-${Date.now()}`;
    setUploadedPdfs((prev) => [
      ...prev,
      { id: tempId, name: file.name, uploading: true },
    ]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (activeChatId) formData.append("chatId", activeChatId);

      const { data } = await api.post("/api/document/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadedPdfs((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? { id: data.documentId, name: data.filename, uploading: false, isYoutube: false }
            : p
        )
      );

      // Call onSuccess first, which will set pdf
      await onSuccess(data);
      
      // Clear processing AFTER onSuccess has set pdf
      setIsProcessing(false);
    } catch (err) {
      setUploadedPdfs((prev) => prev.filter((p) => p.id !== tempId));
      setUploadError(err.response?.data?.error || "Upload failed. Please try again.");
      setIsProcessing(false); // Clear on error
    } finally {
      setUploading(false);
    }
  };

  const resetPdfs = (valueOrFn) => {
    setUploadedPdfs(typeof valueOrFn === "function" ? valueOrFn : valueOrFn);
  };

  const clearError = () => setUploadError("");

  return {
    uploadedPdfs,
    uploading,
    uploadError,
    isProcessing,
    handlePdfSelect,
    resetPdfs,
    clearError,
  };
}