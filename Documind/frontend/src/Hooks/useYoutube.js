import { useState } from "react";
import api from "../Api";

export function useYoutube({ activeChatId, onSuccess, onStart, onFinish, onError }) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim()) return;
    
    // Set processing state IMMEDIATELY
    setIsProcessing(true);
    setYoutubeError("");
    setYoutubeLoading(true);

    const tempId = onStart?.(youtubeUrl.trim());

    try {
      const body = { url: youtubeUrl.trim() };
      if (activeChatId) body.chatId = activeChatId;

      const { data } = await api.post("/api/youtube/process", body);

      onFinish?.(tempId, data);
      setYoutubeUrl("");
      
      // Call onSuccess first, which will set pdf
      await onSuccess(data);
      
      // Clear processing AFTER onSuccess has set pdf
      setIsProcessing(false);
    } catch (err) {
      onError?.(tempId);
      setYoutubeError(
        err.response?.data?.error || "Failed to process video. Try again."
      );
      setIsProcessing(false); // Clear on error
    } finally {
      setYoutubeLoading(false);
    }
  };

  return {
    youtubeUrl,
    setYoutubeUrl,
    youtubeLoading,
    youtubeError,
    isProcessing,
    handleYoutubeSubmit,
    clearYoutubeError: () => setYoutubeError(""),
  };
}