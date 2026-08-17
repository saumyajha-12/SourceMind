import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

const mdComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
  li: ({ children }) => <li className="text-zinc-300">{children}</li>,
  h1: ({ children }) => <h1 className="text-base font-bold text-white mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold text-white mb-1.5">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-white mb-1">{children}</h3>,
  code: ({ children }) => <code className="bg-zinc-900 text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-indigo-500 pl-3 text-zinc-400 italic">{children}</blockquote>,
};

export default function MessageList({ messages, isTyping, user }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ✅ Empty state — shown briefly before first message or if no messages yet
  if (messages.length === 0 && !isTyping) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center">
          <span className="text-2xl">🧠</span>
        </div>
        <p className="text-zinc-400 text-sm font-medium">Source loaded!</p>
        <p className="text-zinc-600 text-xs">Ask me anything about it</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex items-start gap-3 ${
            msg.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          {msg.role === "assistant" && (
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
              D
            </div>
          )}
          <div
            className={`max-w-[75%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-indigo-600 text-white rounded-br-sm"
                : "bg-zinc-800 text-zinc-200 rounded-bl-sm border border-zinc-700"
            }`}
          >
            {msg.role === "assistant" ? (
              <ReactMarkdown components={mdComponents}>{msg.text}</ReactMarkdown>
            ) : (
              msg.text
            )}
          </div>
          {msg.role === "user" && (
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0 mt-1">
              {user?.email?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
        </div>
      ))}

      {isTyping && (
        <div className="flex items-start gap-3 justify-start">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
            D
          </div>
          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-bl-sm px-5 py-4 flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}