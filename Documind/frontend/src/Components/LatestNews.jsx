import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  NewspaperIcon,
  XMarkIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import ArticleCard from "./Articlecard";
import api from "../Api";

const SESSION_KEY = "documind_news_searches";

function saveSearches(s) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { }
}
function loadSearches() {
  try { const r = sessionStorage.getItem(SESSION_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}

// ── Collapsible topic block ────────────────────────────────────────────────
function TopicSection({ search, onChatWith, onRemove, resolvingArticleId }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-800/80 overflow-hidden bg-zinc-900/30 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900/60 border-b border-zinc-800/60">
        <button
          onClick={() => setCollapsed((p) => !p)}
          className="flex items-center gap-3 flex-1 text-left group min-w-0"
        >
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <NewspaperIcon className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-sm font-semibold text-white capitalize truncate">{search.topic}</span>
          <span className="text-[11px] text-zinc-600 shrink-0 bg-zinc-800 px-2 py-0.5 rounded-full ml-1">
            {search.articles.length}
          </span>
          <span className="ml-auto shrink-0 text-zinc-600 group-hover:text-zinc-300 transition-colors">
            {collapsed
              ? <ChevronDownIcon className="w-4 h-4" />
              : <ChevronUpIcon className="w-4 h-4" />}
          </span>
        </button>
        <button
          onClick={() => onRemove(search.topic)}
          className="ml-4 shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all cursor-pointer"
          title="Remove topic"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {search.articles.map((article, idx) => (
            <ArticleCard
              key={article.id ?? idx}
              article={article}
              index={idx + 1}
              onChatWith={onChatWith}
              isResolving={resolvingArticleId === article.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function LatestNews({ onClose, onChatWithUrl }) {
  const navigate = useNavigate();
  const [searches, setSearches] = useState(() => loadSearches());
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolvingArticleId, setResolvingArticleId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { saveSearches(searches); }, [searches]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  const fetchNews = useCallback(async (rawTopic) => {
    const cleaned = rawTopic.trim();
    if (!cleaned) return;

    if (searches.some((s) => s.topic.toLowerCase() === cleaned.toLowerCase())) {
      setError(`"${cleaned}" is already loaded.`);
      setSearchInput("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/news/latest", { params: { topic: cleaned } });
      if (data.success) {
        setSearches((prev) => [{ topic: cleaned, articles: data.data.articles, fetchedAt: Date.now() }, ...prev]);
        setSearchInput("");
      } else {
        setError(data.message || "Failed to fetch news.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch. Try again.");
    } finally {
      setLoading(false);
    }
  }, [searches]);

  const removeTopic = (topic) => setSearches((prev) => prev.filter((s) => s.topic !== topic));
  const clearAll = () => { setSearches([]); sessionStorage.removeItem(SESSION_KEY); };

  const handleChatWith = async (article) => {
    try {
      setResolvingArticleId(article.id);
      setError("");

      const { data } = await api.post("/api/news/resolve-link", {
        title: article.title,
      });
      console.log(data);
      if (!data?.success) {
        setError(data?.message || "Could not resolve article link.");
        return;
      }

      const candidateLinks = (data?.data?.links || []).filter(Boolean).slice(0, 5);
      const firstLink = candidateLinks[0] || "";

      if (!firstLink) {
        setError("No article link found.");
        return;
      }

      if (onChatWithUrl) {
        onChatWithUrl(firstLink, article.title, candidateLinks);
      } else {
        navigate("/chat", { state: { crawlUrl: firstLink, candidateLinks } });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resolve article.");
    } finally {
      setResolvingArticleId(null);
    }
  };

  const totalArticles = searches.reduce((sum, s) => sum + s.articles.length, 0);

  return (
    <div className="h-screen w-full bg-zinc-950 flex flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center gap-4 px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl border border-zinc-700/80 bg-zinc-900 flex items-center justify-center group-hover:border-zinc-500 group-hover:bg-zinc-800 transition-all">
            <ArrowLeftIcon className="w-4 h-4" />
          </div>
          <span className="text-sm hidden sm:block">Back</span>
        </button>

        <div className="w-px h-6 bg-zinc-800" />

        {/* Title */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
            <NewspaperIcon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-semibold text-sm leading-none">Latest News</h1>
            <p className="text-zinc-500 text-[11px] mt-0.5 leading-none">
              {totalArticles > 0
                ? `${totalArticles} article${totalArticles > 1 ? "s" : ""} across ${searches.length} topic${searches.length > 1 ? "s" : ""}`
                : "Search any topic to load headlines"}
            </p>
          </div>
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full shrink-0">
            Beta
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Sidebar ── */}
        <div className="w-72 shrink-0 border-r border-zinc-800/80 bg-zinc-900/20 flex flex-col overflow-hidden">

          {/* Search area */}
          <div className="p-5 border-b border-zinc-800/60">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              Search topic
            </p>
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && !loading && fetchNews(searchInput)}
                placeholder="AI, cricket, politics…"
                disabled={loading}
                className="w-full h-10 bg-zinc-900 border border-zinc-700/80 rounded-xl pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 focus:bg-zinc-900 transition-all disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => fetchNews(searchInput)}
              disabled={!searchInput.trim() || loading}
              className="w-full h-10 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
                  Fetching…
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                  Search
                </>
              )}
            </button>
            {error && (
              <div className="mt-3 flex items-start gap-2 bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2.5">
                <XMarkIcon className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-400 leading-snug">{error}</p>
              </div>
            )}
          </div>

          {/* Loaded topics */}
          <div className="flex-1 overflow-y-auto p-5">
            {searches.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                    Loaded topics
                  </p>
                  {searches.length > 1 && (
                    <button
                      onClick={clearAll}
                      className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {searches.map((s) => (
                    <div
                      key={s.topic}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700/60 transition-colors group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60 shrink-0" />
                      <span className="text-xs text-zinc-300 capitalize truncate flex-1 font-medium">{s.topic}</span>
                      <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-md shrink-0">
                        {s.articles.length}
                      </span>
                      <button
                        onClick={() => removeTopic(s.topic)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 cursor-pointer"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
                  <MagnifyingGlassIcon className="w-5 h-5 text-zinc-700" />
                </div>
                <p className="text-zinc-600 text-xs leading-relaxed max-w-40">
                  Search a topic above to load headlines
                </p>
              </div>
            )}
          </div>

          {/* Footer tip */}
          <div className="p-5 border-t border-zinc-800/60">
            <p className="text-[10px] text-zinc-700 leading-relaxed">
              Searches persist until you close this tab. Click{" "}
              <span className="text-zinc-500">Chat with article</span>{" "}
              on any card to open a chat.
            </p>
          </div>
        </div>

        {/* ── Articles area ── */}
        <div className="flex-1 overflow-y-auto">
          {searches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
                <NewspaperIcon className="w-8 h-8 text-zinc-700" />
              </div>
              <p className="text-white text-base font-semibold mb-2">No articles yet</p>
              <p className="text-zinc-600 text-sm max-w-xs leading-relaxed">
                Use the search panel on the left to find headlines on any topic you're interested in.
              </p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {searches.map((search) => (
                <TopicSection
                  key={search.topic}
                  search={search}
                  onChatWith={handleChatWith}
                  onRemove={removeTopic}
                  resolvingArticleId={resolvingArticleId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}