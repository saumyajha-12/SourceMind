import { useState } from "react";
import api from "../Api";

export function useWebsite({ activeChatId, onSuccess, onStart, onFinish, onError }) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteLoading, setWebsiteLoading] = useState(false);
  const [websiteError, setWebsiteError] = useState("");
  const [websiteProgress, setWebsiteProgress] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleWebsiteSubmit = async () => {
    if (!websiteUrl.trim()) return;
    
    // Set processing state IMMEDIATELY
    setIsProcessing(true);
    setWebsiteError("");
    setWebsiteLoading(true);

    const tempId = onStart?.(websiteUrl.trim());

    try {
      const body = { url: websiteUrl.trim() };
      if (activeChatId) body.chatId = activeChatId;

      const { data } = await api.post("/api/website/process", body, {
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.event?.target?.response) {
            try {
              const lines = progressEvent.event.target.response.split("\n");
              const lastLine = lines.filter(l => l.trim()).pop();
              if (lastLine) {
                const parsed = JSON.parse(lastLine);
                if (parsed.progress) setWebsiteProgress(parsed.progress);
              }
            } catch (e) {}
          }
        }
      });

      onFinish?.(tempId, data);
      setWebsiteUrl("");
      
      // Call onSuccess first, which will set pdf
      await onSuccess(data);
      
      // Clear processing AFTER onSuccess has set pdf
      setIsProcessing(false);
    } catch (err) {
      onError?.(tempId);
      setWebsiteError(
        err.response?.data?.error || "Failed to crawl website. Try again."
      );
      setIsProcessing(false); // Clear on error
    } finally {
      setWebsiteLoading(false);
      setWebsiteProgress("");
    }
  };

  const clearWebsiteError = () => setWebsiteError("");

  return {
    websiteUrl,
    setWebsiteUrl,
    websiteLoading,
    websiteError,
    websiteProgress,
    isProcessing,
    handleWebsiteSubmit,
    clearWebsiteError,
  };
}