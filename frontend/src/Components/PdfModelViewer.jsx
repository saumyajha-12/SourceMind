import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";

export default function PdfViewerModal({ doc, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const pdfUrl = `https://api.mindchuk.co.in/api/document/${doc.id}/view`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[90vw] h-[90vh] bg-zinc-900 rounded-2xl border border-zinc-700 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0">
          <p className="text-sm text-zinc-300 font-medium truncate max-w-[80%]">
            {doc.name}
          </p>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* PDF iframe */}
        <iframe
          src={pdfUrl}
          className="flex-1 w-full"
          title={doc.name}
        />
      </div>
    </div>
  );
}