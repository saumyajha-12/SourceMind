import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../Authcontext";
import { useChatHistory } from "../Hooks/useChatHistory";
import { useMessages } from "../Hooks/useMessages";
import { usePdfUpload } from "../Hooks/usePdfUpload";
import { useYoutube } from "../Hooks/useYoutube";
import { useWebsite } from "../Hooks/useWebsite";
import Sidebar from "../Components/Sidebar";
import Topbar from "../Components/Topbar";
import MessageList from "../Components/MessageList";
import InputBar from "../Components/InputBar";
import UploadGate from "../Components/UploadGate";
import api from "../Api";
import { NewspaperIcon } from "@heroicons/react/24/outline";

export default function Chat() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { chatId: urlChatId } = useParams();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeChatId, setActiveChatId] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [input, setInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [showWebsiteInput, setShowWebsiteInput] = useState(false);
  const [uploadGateKey, setUploadGateKey] = useState(0);

  const fileInputRef = useRef(null);

  const { chatHistory, historyLoading, prependChat, setChatHistory, removeChat } = useChatHistory();

  const { messages, isTyping, sendError, setSendError, sendMessage, appendMessage, clearMessages, setMessages } = useMessages();

  const { uploadedPdfs, uploading, uploadError, handlePdfSelect, resetPdfs, clearError } = usePdfUpload({
    activeChatId,
    onSuccess: (data) => handleSourceSuccess(data, false, false),
  });

  const { youtubeUrl, setYoutubeUrl, youtubeLoading, youtubeError, handleYoutubeSubmit, clearYoutubeError } = useYoutube({
    activeChatId,
    onSuccess: (data) => handleSourceSuccess(data, true, false),
    onStart: () => {
      const tempId = `temp-yt-${Date.now()}`;
      resetPdfs((prev) => [...prev, { id: tempId, name: "Processing video…", uploading: true, isYoutube: true }]);
      return tempId;
    },
    onFinish: (tempId, data) => {
      resetPdfs((prev) =>
        prev.map((p) =>
          p.id === tempId ? { id: data.documentId, name: data.filename, uploading: false, isYoutube: true } : p
        )
      );
    },
    onError: (tempId) => resetPdfs((prev) => prev.filter((p) => p.id !== tempId)),
  });

  const { websiteUrl, setWebsiteUrl, websiteLoading, websiteError, websiteProgress, handleWebsiteSubmit, clearWebsiteError } = useWebsite({
    activeChatId,
    onSuccess: (data) => handleSourceSuccess(data, false, true),
    onStart: () => {
      const tempId = `temp-web-${Date.now()}`;
      resetPdfs((prev) => [...prev, { id: tempId, name: "Crawling website…", uploading: true, isWebsite: true }]);
      return tempId;
    },
    onFinish: (tempId, data) => {
      resetPdfs((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? { id: data.documentId, name: `${data.filename} (${data.pagesScraped} pages)`, uploading: false, isWebsite: true }
            : p
        )
      );
    },
    onError: (tempId) => resetPdfs((prev) => prev.filter((p) => p.id !== tempId)),
  });

  const handleSourceSuccess = (data, isYoutube = false, isWebsite = false) => {
    setPdf({ name: data.filename });
    setActiveChatId(data.chatId);

    if (!activeChatId) {
      prependChat({
        id: data.chatId,
        title: data.filename,
        createdAt: new Date().toISOString(),
        documents: [{ id: data.documentId, filename: data.filename, isYoutube, isWebsite }],
      });
      navigate(`/chat/${data.chatId}`);
    } else {
      setChatHistory((prev) =>
        prev.map((c) =>
          c.id === data.chatId
            ? {
                ...c,
                documents: [...(c.documents ?? []), { id: data.documentId, filename: data.filename, isYoutube, isWebsite }],
              }
            : c
        )
      );
    }

    appendMessage({
      role: "assistant",
      text:
        messages.length === 0
          ? isYoutube
            ? `🎬 I've loaded the transcript for **${data.filename}**. Ask me anything about it!`
            : isWebsite
              ? `🌐 I've crawled **${data.pagesScraped} pages** from **${data.filename}**. Ask me anything about the site!`
              : `📄 I've loaded **${data.filename}**. Ask me anything about it!`
          : isYoutube
            ? `🎬 Also loaded **${data.filename}**. Feel free to ask about any of your sources!`
            : isWebsite
              ? `🌐 Also crawled **${data.pagesScraped} pages** from **${data.filename}**!`
              : `📄 Also loaded **${data.filename}**. Feel free to ask about any of your sources!`,
      id: Date.now(),
    });
  };

  // from latest-news
  const newsCrawlUrl = location.state?.crawlUrl || null;
  const newsCandidateLinks = Array.isArray(location.state?.candidateLinks)
    ? location.state.candidateLinks.filter(Boolean)
    : [];

  useEffect(() => {
    if (newsCrawlUrl || newsCandidateLinks.length) {
      window.history.replaceState({}, "");
    }
  }, [newsCrawlUrl, newsCandidateLinks.length]);

  useEffect(() => {
    if (!urlChatId) {
      setPdf(null);
      resetPdfs([]);
      clearMessages();
      setActiveChatId(null);
      return;
    }
    if (urlChatId === activeChatId) return;
    if (historyLoading) return;

    setActiveChatId(urlChatId);
    clearMessages();
    setSendError("");
    clearError();
    clearYoutubeError();
    clearWebsiteError();

    const found = chatHistory.find((c) => c.id === urlChatId);
    if (found) {
      setPdf({ name: found.title });
      resetPdfs(
        (found.documents ?? []).map((d) => ({
          id: d.id,
          name: d.filename,
          uploading: false,
          isYoutube: d.isYoutube ?? false,
          isWebsite: d.isWebsite ?? false,
        }))
      );
    }

    api.get(`/api/chat/${urlChatId}/messages`)
      .then(({ data }) => {
        setMessages(data.messages.map((m) => ({ role: m.role, text: m.content, id: m.id })));
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setPdf(null);
          resetPdfs([]);
          clearMessages();
          setActiveChatId(null);
          setSendError("");
          navigate("/chat", { replace: true });
        } else {
          setSendError("Could not load previous messages.");
        }
      });
  }, [urlChatId, chatHistory, historyLoading]);

  const startNewChat = () => {
    setPdf(null);
    resetPdfs([]);
    clearMessages();
    setInput("");
    setActiveChatId(null);
    setSendError("");
    clearError();
    clearYoutubeError();
    clearWebsiteError();
    setWebsiteUrl("");
    setYoutubeUrl("");
    setShowYoutubeInput(false);
    setShowWebsiteInput(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadGateKey((k) => k + 1);
    navigate("/chat", { replace: true });
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to sign out?");
    if (!confirmed) return;
    await logout();
    navigate("/signin");
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          handlePdfSelect(e.target.files[0]);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        chatHistory={chatHistory}
        historyLoading={historyLoading}
        activeChatId={activeChatId}
        user={user}
        onNewChat={startNewChat}
        onLogout={handleLogout}
        onDeleteChat={removeChat}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          uploadedPdfs={uploadedPdfs}
          onClear={startNewChat}
        />

        <div className="flex-1 overflow-y-auto px-6 py-8">
          {!pdf ? (
            <UploadGate
              key={uploadGateKey}
              uploading={uploading}
              dragOver={dragOver}
              uploadError={uploadError}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handlePdfSelect(e.dataTransfer.files[0]);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !uploading && fileInputRef.current?.click()}
              youtubeUrl={youtubeUrl}
              setYoutubeUrl={setYoutubeUrl}
              onYoutubeSubmit={handleYoutubeSubmit}
              youtubeLoading={youtubeLoading}
              youtubeError={youtubeError}
              websiteUrl={websiteUrl}
              setWebsiteUrl={setWebsiteUrl}
              onWebsiteSubmit={handleWebsiteSubmit}
              websiteLoading={websiteLoading}
              websiteError={websiteError}
              websiteProgress={websiteProgress}
              autoWebsiteUrl={newsCrawlUrl}
              autoWebsiteUrls={newsCandidateLinks}
            />
          ) : (
            <MessageList messages={messages} isTyping={isTyping} user={user} />
          )}
        </div>

        <InputBar
          pdf={pdf}
          input={input}
          setInput={setInput}
          onSend={() => sendMessage(activeChatId, input, setInput)}
          isTyping={isTyping}
          activeChatId={activeChatId}
          onAttach={() => fileInputRef.current?.click()}
          onAttachYoutube={() => setShowYoutubeInput(true)}
          onAttachWebsite={() => setShowWebsiteInput(true)}
          sendError={sendError}
          uploadError={uploadError}
          onVoiceReply={({ userText, assistantText }) => {
            if (userText) appendMessage({ role: "user", text: userText, id: Date.now() });
            if (assistantText) appendMessage({ role: "assistant", text: assistantText, id: Date.now() + 1 });
          }}
        />
      </div>

      <button
        onClick={() => navigate("/latest-news")}
        className="fixed top-16 right-4 z-50 flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-500/50 text-amber-400 hover:text-amber-300 text-xs font-medium px-3.5 py-2 rounded-full shadow-lg transition-all duration-200 cursor-pointer"
      >
        <NewspaperIcon className="w-3.5 h-3.5 shrink-0" />
        Latest News
        <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full">
          Beta
        </span>
      </button>

      {showYoutubeInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <span className="text-red-400">▶</span> Add YouTube Video
            </h3>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !youtubeLoading) {
                    handleYoutubeSubmit();
                    setShowYoutubeInput(false);
                  }
                  if (e.key === "Escape") setShowYoutubeInput(false);
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={youtubeLoading}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/70 transition"
              />
              <button
                onClick={() => {
                  handleYoutubeSubmit();
                  setShowYoutubeInput(false);
                }}
                disabled={youtubeLoading || !youtubeUrl.trim()}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition cursor-pointer"
              >
                {youtubeLoading ? "…" : "Go"}
              </button>
            </div>
            {youtubeError && <p className="text-xs text-red-400 mt-2">{youtubeError}</p>}
            <button
              onClick={() => setShowYoutubeInput(false)}
              className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showWebsiteInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
              <span className="text-emerald-400">🌐</span> Crawl a Website
            </h3>
            <p className="text-zinc-500 text-xs mb-4">We'll scrape the page and let you chat with its content</p>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !websiteLoading) {
                    handleWebsiteSubmit();
                    setShowWebsiteInput(false);
                  }
                  if (e.key === "Escape") setShowWebsiteInput(false);
                }}
                placeholder="https://example.com/article"
                disabled={websiteLoading}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/70 transition"
              />
              <button
                onClick={() => {
                  handleWebsiteSubmit();
                  setShowWebsiteInput(false);
                }}
                disabled={websiteLoading || !websiteUrl.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition cursor-pointer"
              >
                {websiteLoading ? "…" : "Go"}
              </button>
            </div>
            {websiteError && <p className="text-xs text-red-400 mt-2">{websiteError}</p>}
            <button
              onClick={() => setShowWebsiteInput(false)}
              className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}