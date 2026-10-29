import { useState, useRef } from "react";
import api from "../Api";

export function useMessages() {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sendError, setSendError] = useState("");
  const abortRef = useRef(null);

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

    // Create a placeholder assistant message that will be updated with streamed tokens
    const assistantMsgId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: "", id: assistantMsgId },
    ]);

    try {
      const baseURL = api.defaults.baseURL;
      // Get the Bearer token from axios defaults (set by AuthContext)
      const authHeader = api.defaults.headers.common?.["Authorization"] || "";

      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch(`${baseURL}/api/chat/message/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ chatId, message: sentInput }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Try to parse error body
        const errorText = await response.text();
        let errorMsg = `Server error: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // Not JSON
        }

        // If 401, let user know to re-login
        if (response.status === 401) {
          errorMsg = "Session expired. Please sign in again.";
        }
        throw new Error(errorMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.error) {
              throw new Error(event.error);
            }

            if (event.token) {
              // Append token to the assistant message
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, text: m.text + event.token }
                    : m
                )
              );
            }
            // event.done — stream complete, nothing more to do
          } catch (parseErr) {
            if (parseErr.message && !parseErr.message.includes("JSON")) {
              throw parseErr; // Re-throw non-parse errors
            }
          }
        }
      }

      // If the assistant message is still empty after stream, something went wrong
      setMessages((prev) => {
        const assistantMsg = prev.find((m) => m.id === assistantMsgId);
        if (assistantMsg && !assistantMsg.text.trim()) {
          return prev.filter((m) => m.id !== assistantMsgId);
        }
        return prev;
      });
    } catch (err) {
      if (err.name === "AbortError") return;

      const errorMsg = err.message || "Failed to get a response. Try again.";
      setSendError(errorMsg);
      // Remove both the user message and empty assistant message on error
      setMessages((prev) =>
        prev.filter((m) => m.id !== userMsg.id && m.id !== assistantMsgId)
      );
      setInput(sentInput);
    } finally {
      setIsTyping(false);
      abortRef.current = null;
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
    setMessages,
  };
}
