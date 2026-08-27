import { useEffect, useState } from "react";
import { X, ExternalLink } from "../lib/icons";

/**
 * The tender document, embedded.
 *
 * Resolves the file for THIS reading rather than showing a fixed one. Every
 * screen here pointed at a path in `public/` -- the single document that shipped
 * with the build -- so a bid manager opening any tender saw the same PDF
 * regardless of which had been uploaded, and every page citation beside it was
 * pointing at a page of somebody else's document.
 *
 * The bucket is private, so the URL is signed on the server and expires.
 *
 * No download. The document is a reference while somebody works beside it, and a
 * copy in a downloads folder is a second version of the tender that will not
 * follow a corrigendum. Opening in a new tab stays, for a second screen.
 */
export function PdfViewerModal({
  rfpId,
  title,
  subtitle,
  onClose,
}: {
  /** The reading whose document to show. */
  rfpId: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let live = true;
    fetch("/api/document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rfpId }),
    })
      .then((res) => res.json())
      .then((json: { url: string | null }) => {
        if (!live) return;
        if (json.url) setUrl(json.url);
        else setMissing(true);
      })
      .catch(() => live && setMissing(true));
    return () => {
      live = false;
    };
  }, [rfpId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/70 p-4 sm:p-8">
      <div className="animate-fade absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-ink">{title}</h2>
            {subtitle ? <p className="truncate text-xs text-stone-500">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
              >
                <ExternalLink width={14} height={14} />
                New tab
              </a>
            ) : null}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-ink"
            >
              <X width={18} height={18} />
            </button>
          </div>
        </div>

        {missing ? (
          <div className="flex min-h-0 flex-1 items-center justify-center bg-stone-50 p-8">
            <div className="max-w-[52ch] text-center">
              <p className="text-sm font-semibold text-ink">This tender's document is not held</p>
              <p className="mt-1 text-sm text-stone-500">
                It was read before the file was kept, so there is nothing to display. Reading
                it again stores the document alongside the result.
              </p>
            </div>
          </div>
        ) : url ? (
          <iframe src={`${url}#view=FitH`} title={title} className="min-h-0 flex-1 bg-stone-100" />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center bg-stone-50">
            <p className="text-sm text-stone-500">Opening the document…</p>
          </div>
        )}
      </div>
    </div>
  );
}
