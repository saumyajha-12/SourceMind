import { useEffect, useRef, useState } from "react";
import {
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

function YouTubeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function UploadGate({
  uploading,
  dragOver,
  uploadError,
  onDrop,
  onDragOver,
  onDragLeave,
  onClick,
  youtubeUrl,
  setYoutubeUrl,
  onYoutubeSubmit,
  youtubeLoading,
  youtubeError,
  websiteUrl,
  setWebsiteUrl,
  onWebsiteSubmit,
  websiteLoading,
  websiteError,
  websiteProgress,
  autoWebsiteUrl,
  autoWebsiteUrls = [],
}) {
  const initialAutoLinks = Array.isArray(autoWebsiteUrls) && autoWebsiteUrls.length
    ? autoWebsiteUrls.filter(Boolean)
    : (autoWebsiteUrl ? [autoWebsiteUrl] : []);

  const [mode, setMode] = useState(initialAutoLinks.length ? "website" : null);
  const [retryLinks, setRetryLinks] = useState(initialAutoLinks);
  const [currentRetryIndex, setCurrentRetryIndex] = useState(0);
  const [pendingUrl, setPendingUrl] = useState(initialAutoLinks[0] || null);
  const [retryDone, setRetryDone] = useState(false);

  const startedRef = useRef(false);
  const finishedRef = useRef(false);

  const isAutoRetryFlow = retryLinks.length > 0 && !retryDone;

  const goHome = () => {
    setPendingUrl(null);
    setMode(null);
    setRetryDone(true);
    setRetryLinks([]);
    setCurrentRetryIndex(0);
    startedRef.current = false;
    finishedRef.current = false;
  };

  useEffect(() => {
    if (!initialAutoLinks.length) return;
    const first = initialAutoLinks[0];
    setRetryLinks(initialAutoLinks);
    setCurrentRetryIndex(0);
    setPendingUrl(first);
    setMode("website");
    setRetryDone(false);
    setWebsiteUrl(first);
    startedRef.current = false;
    finishedRef.current = false;
  }, [autoWebsiteUrl, JSON.stringify(autoWebsiteUrls), setWebsiteUrl]);

  // start first/next attempt
  useEffect(() => {
    if (mode !== "website") return;
    if (!pendingUrl) return;
    if (websiteLoading) return;
    if (startedRef.current) return;

    const t = setTimeout(() => {
      setWebsiteUrl(pendingUrl);
      startedRef.current = true;
      finishedRef.current = false;
      onWebsiteSubmit();
    }, 150);

    return () => clearTimeout(t);
  }, [mode, pendingUrl, websiteLoading, onWebsiteSubmit, setWebsiteUrl]);


  // when one attempt finishes with error, wait 500ms, then move to next link
  useEffect(() => {
    if (!isAutoRetryFlow) return;
    if (!startedRef.current) return;
    if (websiteLoading) return;
    if (finishedRef.current) return;

    finishedRef.current = true;

    if (!websiteError) {
      setRetryDone(true);
      setPendingUrl(null);
      return;
    }

    const nextIndex = currentRetryIndex + 1;

    if (nextIndex >= retryLinks.length || nextIndex >= 5) {
      setRetryDone(true);
      setPendingUrl(null);
      return;
    }

    const timer = setTimeout(() => {
      const nextUrl = retryLinks[nextIndex];
      setCurrentRetryIndex(nextIndex);
      setPendingUrl(nextUrl);
      setWebsiteUrl(nextUrl);

      startedRef.current = false;
      finishedRef.current = false;
    }, 3000);

    return () => clearTimeout(timer);
  }, [
    websiteLoading,
    websiteError,
    currentRetryIndex,
    retryLinks,
    isAutoRetryFlow,
    setWebsiteUrl,
  ]);

  if (!mode) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6">
        <div className="text-center mb-2">
          <h2 className="text-white font-semibold text-lg">What do you want to chat with?</h2>
          <p className="text-zinc-500 text-sm mt-1">Choose a source to get started</p>
        </div>

        <div className="flex gap-4 flex-wrap justify-center">
          <button
            onClick={() => setMode("pdf")}
            className="group flex flex-col items-center gap-4 w-44 border-2 border-dashed border-zinc-700 hover:border-indigo-500 hover:bg-indigo-500/5 rounded-2xl p-7 transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 group-hover:bg-indigo-500/10 flex items-center justify-center transition">
              <DocumentTextIcon className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium text-sm">PDF Document</p>
              <p className="text-zinc-500 text-xs mt-1">Upload any PDF file</p>
            </div>
          </button>

          <button
            onClick={() => setMode("youtube")}
            className="group flex flex-col items-center gap-4 w-44 border-2 border-dashed border-zinc-700 hover:border-red-500 hover:bg-red-500/5 rounded-2xl p-7 transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 group-hover:bg-red-500/10 flex items-center justify-center transition">
              <YouTubeIcon className="w-6 h-6 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium text-sm">YouTube Video</p>
              <p className="text-zinc-500 text-xs mt-1">Chat with any video</p>
            </div>
          </button>

          <button
            onClick={() => setMode("website")}
            className="group flex flex-col items-center gap-4 w-44 border-2 border-dashed border-zinc-700 hover:border-emerald-500 hover:bg-emerald-500/5 rounded-2xl p-7 transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 group-hover:bg-emerald-500/10 flex items-center justify-center transition">
              <GlobeAltIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium text-sm">Website</p>
              <p className="text-zinc-500 text-xs mt-1">Crawl up to 10 pages</p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 text-zinc-600 text-sm mt-4">
          <ChatBubbleLeftRightIcon className="w-4 h-4" />
          <span>Powered by DocuMind AI</span>
        </div>
      </div>
    );
  }

  if (mode === "pdf") {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <button onClick={goHome} className="mb-6 text-xs text-zinc-500 hover:text-zinc-300 transition cursor-pointer">
          ← Back
        </button>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={onClick}
          className={`cursor-pointer w-full max-w-lg border-2 border-dashed rounded-2xl p-14 flex flex-col items-center gap-5 transition-all duration-200 ${uploading
              ? "border-indigo-500 bg-indigo-500/5 cursor-wait"
              : dragOver
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900"
            }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
            {uploading
              ? <span className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              : <DocumentTextIcon className="w-8 h-8 text-indigo-400" />}
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-base">{uploading ? "Uploading…" : "Upload a PDF"}</p>
            <p className="text-zinc-500 text-sm mt-1.5">{uploading ? "Please wait" : "Drag & drop or click to browse"}</p>
          </div>
          {!uploading && (
            <span className="text-xs text-zinc-600 bg-zinc-800 px-4 py-1.5 rounded-full">.pdf files only</span>
          )}
        </div>
        {uploadError && (
          <p className="mt-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 max-w-lg w-full text-center">
            {uploadError}
          </p>
        )}
      </div>
    );
  }

  if (mode === "youtube") {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <button onClick={goHome} className="mb-6 text-xs text-zinc-500 hover:text-zinc-300 transition cursor-pointer">
          ← Back
        </button>
        <div className="w-full max-w-lg flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
            {youtubeLoading
              ? <span className="w-7 h-7 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              : <YouTubeIcon className="w-8 h-8 text-red-400" />}
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-base">{youtubeLoading ? "Processing video…" : "Paste a YouTube URL"}</p>
            <p className="text-zinc-500 text-sm mt-1.5">
              {youtubeLoading ? "Fetching transcript, please wait" : "We'll extract the transcript and let you chat with it"}
            </p>
          </div>
          <div className="w-full flex gap-2">
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !youtubeLoading && onYoutubeSubmit()}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={youtubeLoading}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/70 transition"
            />
            <button
              onClick={onYoutubeSubmit}
              disabled={youtubeLoading || !youtubeUrl.trim()}
              className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition cursor-pointer"
            >
              {youtubeLoading ? "Loading…" : "Go"}
            </button>
          </div>
          {youtubeError && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 w-full text-center">
              {youtubeError}
            </p>
          )}
          <p className="text-xs text-zinc-600 text-center">
            Works with any YouTube video that has captions or auto-generated subtitles
          </p>
        </div>
      </div>
    );
  }

  if (mode === "website") {
    const showRetryMeta = isAutoRetryFlow && pendingUrl;

    return (
      <div className="h-full flex flex-col items-center justify-center">
        <button onClick={goHome} className="mb-6 text-xs text-zinc-500 hover:text-zinc-300 transition cursor-pointer">
          ← Back
        </button>

        <div className="w-full max-w-lg flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
            {websiteLoading
              ? <span className="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              : <GlobeAltIcon className="w-8 h-8 text-emerald-400" />}
          </div>

          <div className="text-center">
            <p className="text-white font-semibold text-base">
              {websiteLoading ? websiteProgress || "Crawling page…" : "Paste a Website URL"}
            </p>
            <p className="text-zinc-500 text-sm mt-1.5">
              {websiteLoading
                ? "Scraping content — this may take a moment"
                : "We'll crawl up to 10 pages and let you chat with all of them"}
            </p>
          </div>

          {showRetryMeta ? (
            <div className="w-full text-center space-y-2">
              <p className="text-xs text-zinc-500">
                Trying link {currentRetryIndex + 1} of {Math.min(retryLinks.length, 5)}
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto truncate">
                Loading: <span className="text-zinc-300">{pendingUrl}</span>
              </p>
              {!websiteLoading && websiteError && currentRetryIndex < Math.min(retryLinks.length, 5) - 1 && (
                <p className="text-xs text-amber-400">
                  This one failed. Trying next link…
                </p>
              )}
              {!websiteLoading && websiteError && currentRetryIndex >= Math.min(retryLinks.length, 5) - 1 && (
                <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 w-full text-center">
                  {websiteError}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="w-full flex gap-2">
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !websiteLoading && onWebsiteSubmit()}
                  placeholder="https://example.com/article"
                  disabled={websiteLoading}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/70 transition"
                />
                <button
                  onClick={onWebsiteSubmit}
                  disabled={websiteLoading || !websiteUrl.trim()}
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition cursor-pointer"
                >
                  {websiteLoading ? "Crawling…" : "Crawl"}
                </button>
              </div>

              {websiteError && (
                <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 w-full text-center">
                  {websiteError}
                </p>
              )}

              {!websiteLoading && (
                <p className="text-xs text-zinc-500 text-center max-w-md">
                  Works best with websites that don't require login. Some sites that block bots may not work.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}