import { useState } from "react";
import api from "../Api";

export function useMessages() {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sendError, setSendError] = useState("");

  const loadMessages = async (chatId) => {
    try {
      const { data } = await api.get(`/api/chat/${chatId}/messages`);
      setMessages(
        data.messages.map((m) => ({ role: m.role, text: m.content, id: m.id }))
      );
    } catch (err) {
      setSendError("Could not load previous messages.");
    }
  };

  const sendMessage = async (chatId, input, setInput) => {
    if (!input.trim() || !chatId) return;
    setSendError("");

    const userMsg = { role: "user", text: input.trim(), id: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    const sentInput = input.trim();
    setInput("");
    setIsTyping(true);

    try {
      const { data } = await api.post("/api/chat/message", {
        chatId,
        message: sentInput,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply, id: Date.now() },
      ]);
    } catch (err) {
      setSendError(
        err.response?.data?.error || "Failed to get a response. Try again."
      );
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setInput(sentInput);
    } finally {
      setIsTyping(false);
    }
  };

  const appendMessage = (msg) => setMessages((prev) => [...prev, msg]);
  const clearMessages = () => setMessages([]);

  return {
    messages,
    isTyping,
    sendError,
    setSendError,
    sendMessage,
    loadMessages,
    appendMessage,
    clearMessages,
    setMessages, // ✅ exported so Chat.jsx can set messages directly
  };
}