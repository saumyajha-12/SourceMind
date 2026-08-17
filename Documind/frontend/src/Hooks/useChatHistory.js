import { useState, useEffect } from "react";
import api from "../Api";

export function useChatHistory() {
  const [chatHistory, setChatHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get("/api/chat/history");
        setChatHistory(data.chats);
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetch();
  }, []);

  const prependChat = (newChat) => {
    setChatHistory((prev) => [newChat, ...prev]);
  };

  // ✅ New — remove chat from local state
  const removeChat = (chatId) => {
    setChatHistory((prev) => prev.filter((c) => c.id !== chatId));
  };

  return { chatHistory, historyLoading, prependChat, setChatHistory, removeChat };
}