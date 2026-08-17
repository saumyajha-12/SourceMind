import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DocumentTextIcon,
  ChevronDoubleLeftIcon,
  PlusIcon,
  ArrowLeftStartOnRectangleIcon,
  GlobeAltIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../Api";

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function YouTubeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  chatHistory,
  historyLoading,
  activeChatId,
  user,
  onNewChat,
  onLogout,
  onDeleteChat,
}) {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (e, chatId) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      "Delete this chat? This will permanently remove all messages and uploaded documents."
    );
    if (!confirmed) return;

    setDeletingId(chatId);
    try {
      await api.delete(`/api/chat/${chatId}`);
      onDeleteChat(chatId);

      // ✅ If deleting active chat — reset everything
      if (activeChatId === chatId) {
        onNewChat();
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
      alert("Failed to delete chat. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside
      className={`${
        sidebarOpen ? "w-72" : "w-0"
      } shrink-0 transition-all duration-300 overflow-hidden flex flex-col bg-zinc-900 border-r border-zinc-800`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-sm text-white tracking-wide">
            DocuMind
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
        >
          <ChevronDoubleLeftIcon className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3 pt-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition border border-zinc-800 hover:border-zinc-700 cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          New chat
        </button>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto px-3 pt-4 pb-4 space-y-1">
        <p className="text-xs text-zinc-600 uppercase tracking-widest px-2 mb-2">
          Recent
        </p>
        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chatHistory.length === 0 ? (
          <p className="text-xs text-zinc-600 px-2">No chats yet</p>
        ) : (
          chatHistory.map((chat) => {
            const hasYoutube = chat.documents?.some((d) => d.isYoutube);
            const hasWebsite = chat.documents?.some((d) => d.isWebsite);
            const isDeleting = deletingId === chat.id;

            return (
              <div
                key={chat.id}
                className={`flex items-center gap-1 rounded-lg transition ${
                  activeChatId === chat.id
                    ? "bg-zinc-800"
                    : "hover:bg-zinc-800/60"
                }`}
              >
                {/* Chat button */}
                <button
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  disabled={isDeleting}
                  className={`flex-1 text-left px-3 py-2.5 cursor-pointer min-w-0 rounded-lg ${
                    activeChatId === chat.id
                      ? "text-white"
                      : "text-zinc-400 hover:text-white"
                  } ${isDeleting ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    {isDeleting ? (
                      <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : hasYoutube ? (
                      <YouTubeIcon className="w-3 h-3 text-red-400 shrink-0" />
                    ) : hasWebsite ? (
                      <GlobeAltIcon className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <DocumentTextIcon className="w-3 h-3 text-indigo-400 shrink-0" />
                    )}
                    <p className="text-xs font-medium truncate">{chat.title}</p>
                  </div>
                  <p className="text-[10px] text-zinc-700 mt-0.5 pl-4">
                    {formatDate(chat.createdAt)}
                  </p>
                </button>

                {/* ✅ Delete button — always visible */}
                {!isDeleting ? (
                  <button
                    onClick={(e) => handleDelete(e, chat.id)}
                    className="shrink-0 p-1.5 mr-1 rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition cursor-pointer"
                    title="Delete chat"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="w-6 mr-1" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* User footer */}
      <div className="border-t border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? "U"}
          </div>
          <span className="text-xs text-zinc-400 truncate">
            {user?.email ?? "User"}
          </span>
        </div>
        <button
          onClick={onLogout}
          className="text-zinc-500 hover:text-red-400 transition shrink-0 cursor-pointer"
          title="Sign out"
        >
          <ArrowLeftStartOnRectangleIcon className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}