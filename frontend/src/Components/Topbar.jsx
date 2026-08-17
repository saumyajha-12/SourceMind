import { useState } from "react";
import {
  DocumentTextIcon,
  XMarkIcon,
  ChevronDoubleRightIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import PdfViewerModal from "./PdfModelViewer";

function YouTubeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function Topbar({
  sidebarOpen,
  setSidebarOpen,
  uploadedPdfs,
  onClear,
}) {
  const [viewingDoc, setViewingDoc] = useState(null);

  return (
    <>
      <header className="flex items-center gap-2 px-6 py-3 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm shrink-0 overflow-x-auto">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-zinc-500 hover:text-zinc-300 transition shrink-0 cursor-pointer"
          >
            <ChevronDoubleRightIcon className="w-4 h-4" />
          </button>
        )}

        {uploadedPdfs.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            {uploadedPdfs.map((doc) => (
              <div key={doc.id}>
                {doc.uploading ? (
                  // ── Uploading state ──────────────────────────────────
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-indigo-500/10 border-indigo-500/40 cursor-wait">
                    <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="text-xs truncate max-w-40 text-indigo-300">
                      {doc.name}
                    </span>
                  </div>
                ) : doc.isYoutube ? (
                  // ── YouTube badge — no click ──────────────────────────
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-zinc-800 border-zinc-700 cursor-default">
                    <YouTubeIcon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="text-xs truncate max-w-40 text-zinc-300">
                      {doc.name}
                    </span>
                  </div>
                ) : doc.isWebsite ? (
                  // ── Website badge — no click ──────────────────────────
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-zinc-800 border-zinc-700 cursor-default">
                    <GlobeAltIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs truncate max-w-40 text-zinc-300">
                      {doc.name}
                    </span>
                  </div>
                ) : (
                  // ── PDF badge — clickable to open viewer ─────────────
                  <button
                    onClick={() => setViewingDoc(doc)}
                    className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-zinc-800 border-zinc-700 hover:border-indigo-500/50 hover:bg-zinc-700 transition cursor-pointer"
                  >
                    <DocumentTextIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-xs truncate max-w-40 text-zinc-300">
                      {doc.name}
                    </span>
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={onClear}
              className="flex items-center gap-1 text-zinc-600 hover:text-red-400 transition text-xs px-2 py-1.5 rounded-lg hover:bg-zinc-800 shrink-0 cursor-pointer"
              title="Clear and start new chat"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        ) : (
          <span className="text-sm text-zinc-500">No source loaded</span>
        )}
      </header>

      {viewingDoc && (
        <PdfViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />
      )}
    </>
  );
}