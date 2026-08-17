import { ArrowTopRightOnSquareIcon, ClockIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

function formatPubDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function ArticleCard({ article, index, onChatWith, isResolving }) {
  const articleUrl = article.googleNewsLink || article.link || "";

  return (
    <div className="relative rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200 p-4">
      {/* ID pill */}
      <span className="absolute -top-2.5 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500">
        #{article.id ?? index}
      </span>

      <div className="mt-1">
        {/* Title + open link */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-white font-medium leading-snug flex-1">{article.title}</p>
          {articleUrl && (
            <a
              href={articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 transition active:scale-95"
              title="Open article"
            >
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {article.source && article.source !== "Unknown" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">
              {article.source}
            </span>
          )}
          {article.pubDate && (
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {formatPubDate(article.pubDate)}
            </span>
          )}
        </div>

        {/* Snippet */}
        {article.contentSnippet && (
          <p className="text-xs text-zinc-500 mt-2 leading-5 line-clamp-2">{article.contentSnippet}</p>
        )}

        {/* Chat button */}
        <button
          onClick={() => onChatWith(article)}
          disabled={isResolving}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 text-xs font-medium transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isResolving ? (
            <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
          )}
          {isResolving ? "Opening chat..." : "Chat with this article"}
        </button>
      </div>
    </div>
  );
}