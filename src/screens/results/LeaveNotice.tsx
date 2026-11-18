import { useEffect } from 'react';

/** Shown before the student leaves a report: it is not kept, so they are told to download the PDF first. */
export function LeaveNotice({ onDownload, onLeave, onStay, leaving }: { onDownload: () => void; onLeave: () => void; onStay: () => void; leaving: boolean }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !leaving) onStay(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStay, leaving]);
  return <div role="alertdialog" aria-modal="true" aria-labelledby="leave-title" aria-describedby="leave-text" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 print:hidden" onClick={() => { if (!leaving) onStay(); }}>
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
      <h2 id="leave-title" className="text-lg font-extrabold text-[#0b0f3d]">Leave this report?</h2>
      <p id="leave-text" className="mt-2 text-[14px] leading-relaxed text-[#4b5275]">
        Your results are not saved. Once you leave this page the report is deleted from our servers and cannot be opened again. If you want a copy, <b className="text-[#0b0f3d]">download the PDF first</b>.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
        <button type="button" autoFocus onClick={onDownload} disabled={leaving} className="inline-flex items-center justify-center rounded-xl bg-[#1a1fcc] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1115a5] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1fcc]">Download PDF</button>
        <button type="button" onClick={onStay} disabled={leaving} className="inline-flex items-center justify-center rounded-xl border border-[#d9d7f7] bg-white px-4 py-2.5 text-sm font-bold text-[#2b25c8] hover:bg-[#f6f6ff] disabled:opacity-60">Stay on this page</button>
        <button type="button" onClick={onLeave} disabled={leaving} className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold text-[#9f1239] hover:bg-rose-50 disabled:opacity-60">{leaving ? 'Leaving...' : 'Leave and delete'}</button>
      </div>
    </div>
  </div>;
}
