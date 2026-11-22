import { useEffect } from 'react';

/**
 * Shown before the student leaves a report. Reports are not kept, so the dialog says so, shows which report would be lost,
 * and puts "Download PDF" first. Layout and wording follow the "5 · Leave report (Web)" design.
 */
export function LeaveNotice({ title, score, onDownload, onLeave, onStay, leaving }: {
  title: string; score: number; onDownload: () => void; onLeave: () => void; onStay: () => void; leaving: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !leaving) onStay(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStay, leaving]);
  return <div role="alertdialog" aria-modal="true" aria-labelledby="leave-title" aria-describedby="leave-text"
    className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(11,10,46,.55)] p-4 backdrop-blur-[3px] print:hidden" onClick={() => { if (!leaving) onStay(); }}>
    <div className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-[28px] bg-white px-6 pb-6 pt-8 text-center shadow-[0_40px_90px_-30px_rgba(11,10,46,.7)] sm:px-9 sm:pb-7" onClick={event => event.stopPropagation()}>
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-[#fff1da] text-[#e08a00]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
      </span>
      <h2 id="leave-title" className="mb-2 mt-[18px] text-[26px] font-extrabold leading-[1.15] tracking-[-.025em] text-[#0b0a2e] sm:text-[28px]">Download before you go</h2>
      <p id="leave-text" className="mx-auto mb-[22px] max-w-[380px] text-[15px] leading-[1.55] text-[#5a5778]">Reports aren’t stored. If you leave now, this one is gone for good.</p>
      <div className="flex items-center gap-3 rounded-2xl border border-[#dcdcfa] bg-[#f0f0fe] px-3.5 py-3 text-left">
        <span className="flex size-[46px] flex-none items-center justify-center rounded-[13px] bg-gradient-to-br from-[#1c1177] to-[#2b25c8] text-lg font-extrabold text-white" aria-label={`Score ${Math.round(score)}`}>{Math.round(score)}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="truncate text-sm text-[#0b0a2e]">{title}</b>
          <small className="mt-0.5 text-xs text-[#6b6890]">Coherence report</small>
        </span>
        <span className="inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-full bg-[#fee8ec] px-2.5 py-[5px] text-[11.5px] font-bold text-[#c21f43]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></svg>
          Deleted if you leave
        </span>
      </div>
      <button type="button" autoFocus onClick={onDownload} disabled={leaving}
        className="mt-6 inline-flex h-14 w-full items-center justify-center gap-[9px] rounded-[15px] bg-[#2b25c8] text-base font-extrabold text-white shadow-[0_14px_26px_-14px_rgba(43,37,200,.8)] transition hover:-translate-y-0.5 hover:bg-[#231ea8] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b25c8]">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
        Download PDF
      </button>
      <div className="mt-2.5 flex gap-2.5">
        <button type="button" onClick={onStay} disabled={leaving}
          className="inline-flex h-[50px] flex-1 items-center justify-center rounded-[14px] border border-[#dad8f2] bg-white text-[14.5px] font-bold text-[#0b0a2e] transition hover:-translate-y-0.5 hover:bg-[#f6f5ff] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b25c8]">Stay here</button>
        <button type="button" onClick={onLeave} disabled={leaving}
          className="inline-flex h-[50px] flex-1 items-center justify-center rounded-[14px] border border-[#f6c6d0] bg-white text-[14.5px] font-bold text-[#d92d4b] transition hover:-translate-y-0.5 hover:bg-[#fee8ec] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d92d4b]">{leaving ? 'Leaving...' : 'Leave without saving'}</button>
      </div>
    </div>
  </div>;
}
