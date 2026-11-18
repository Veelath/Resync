import { useEffect } from 'react';

/** The report PDF shown first; it is downloaded only when the student chooses to. */
export function PdfPreview({ url, fileName, onClose }: { url: string | null; fileName: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-3 print:hidden" onClick={onClose}>
    <div className="flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1dffa] px-5 py-3">
        <h2 id="pdf-preview-title" className="text-base font-extrabold text-[#0b0f3d]">Preview of your report</h2>
        <div className="flex gap-2">
          {url ? <a href={url} download={fileName} className="inline-flex items-center rounded-xl bg-[#1a1fcc] px-4 py-2 text-sm font-bold text-white hover:bg-[#1115a5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1fcc]">Download PDF</a>
            : <span className="inline-flex items-center rounded-xl bg-[#1a1fcc] px-4 py-2 text-sm font-bold text-white opacity-60">Download PDF</span>}
          <button type="button" autoFocus onClick={onClose} className="rounded-xl border border-[#d9d7f7] bg-white px-4 py-2 text-sm font-bold text-[#2b25c8] hover:bg-[#f6f6ff]">Close preview</button>
        </div>
      </div>
      {url ? <iframe title="Report PDF preview" src={url} className="min-h-0 flex-1 border-0" />
        : <p role="status" className="m-auto p-8 text-sm font-semibold text-[#4b5275]">Preparing your report…</p>}
    </div>
  </div>;
}
