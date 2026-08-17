import { useEffect, useRef, useState } from "react";
import { PaperClipIcon, PaperAirplaneIcon, GlobeAltIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

function YouTubeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function InputBar({
  pdf,
  input,
  setInput,
  onSend,
  isTyping,
  activeChatId,
  onAttach,
  onAttachYoutube,
  onAttachWebsite,
  sendError,
  uploadError,
  onVoiceReply,
}) {
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [input]);

  // Auto focus on keypress
  useEffect(() => {
    if (!pdf) return;
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "INPUT" ||
        e.metaKey || e.ctrlKey || e.altKey ||
        e.key === "Tab" || e.key === "Escape" || e.key === "Enter"
      ) return;
      textareaRef.current?.focus();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pdf]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="shrink-0 px-6 pb-6 pt-4 border-t border-zinc-800 bg-zinc-950">
      <div className="max-w-4xl mx-auto">
        {sendError && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2 mb-3">
            {sendError}
          </p>
        )}
        {uploadError && pdf && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2 mb-3">
            {uploadError}
          </p>
        )}
        <div
          className={`relative flex flex-col bg-zinc-900 border rounded-2xl transition ${
            pdf
              ? "border-zinc-700 focus-within:border-indigo-500/70 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
              : "border-zinc-800 opacity-50 pointer-events-none"
          }`}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              pdf
                ? "Ask something about your document…"
                : "Upload a source first to start chatting"
            }
            disabled={!pdf}
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 resize-none focus:outline-none px-4 pt-4 pb-2 min-h-13 max-h-40 leading-relaxed"
          />

          <div className="flex items-center justify-between px-3 pb-3 pt-1">

            {/* ── Attach button with dropdown ─────────────────────── */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className="flex items-center gap-1.5 text-zinc-500 hover:text-indigo-400 transition px-2 py-1.5 rounded-lg hover:bg-zinc-800 text-xs cursor-pointer"
                title="Add a source"
              >
                <PaperClipIcon className="w-4 h-4" />
                <span>Add source</span>
              </button>

              {/* Dropdown menu */}
              {showMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden w-48 z-50">
                  {/* PDF */}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onAttach();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                  >
                    <DocumentTextIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-medium">PDF Document</p>
                      <p className="text-[10px] text-zinc-600">Upload a PDF file</p>
                    </div>
                  </button>

                  <div className="border-t border-zinc-800" />

                  {/* YouTube */}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onAttachYoutube?.();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                  >
                    <YouTubeIcon className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-medium">YouTube Video</p>
                      <p className="text-[10px] text-zinc-600">Paste a video URL</p>
                    </div>
                  </button>

                  <div className="border-t border-zinc-800" />

                  {/* Website */}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onAttachWebsite?.();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                  >
                    <GlobeAltIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-medium">Website</p>
                      <p className="text-[10px] text-zinc-600">Crawl up to 10 pages</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600 hidden sm:block">
                Shift+Enter for new line
              </span>
              <button
                onClick={onSend}
                disabled={!pdf || !input.trim() || isTyping}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-medium transition cursor-pointer"
              >
                <PaperAirplaneIcon className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}