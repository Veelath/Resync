import { useEffect } from 'react';

/** A problem the student must not miss, for example "this does not look like a research paper": shown over the page, not only at its end. */
export function ProblemDialog({ title, message, actionLabel, onAction, onClose }: {
  title: string; message: string; actionLabel: string; onAction: () => void; onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div role="alertdialog" aria-modal="true" aria-labelledby="problem-title" aria-describedby="problem-text"
    className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(11,10,46,.55)] p-4 backdrop-blur-[3px]" onClick={onClose}>
    <div className="max-h-full w-full max-w-[480px] overflow-y-auto rounded-[28px] bg-white px-6 pb-6 pt-8 text-center shadow-[0_40px_90px_-30px_rgba(11,10,46,.7)] sm:px-9 sm:pb-7" onClick={event => event.stopPropagation()}>
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-[#fee8ec] text-[#d92d4b]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
      </span>
      <h2 id="problem-title" className="mb-2 mt-[18px] text-[24px] font-extrabold leading-[1.15] tracking-[-.025em] text-[#0b0a2e] sm:text-[26px]">{title}</h2>
      <p id="problem-text" className="mx-auto mb-6 max-w-[400px] text-[15px] leading-[1.55] text-[#5a5778]">{message}</p>
      <button type="button" autoFocus onClick={onAction}
        className="inline-flex h-14 w-full items-center justify-center rounded-[15px] bg-[#2b25c8] text-base font-extrabold text-white shadow-[0_14px_26px_-14px_rgba(43,37,200,.8)] transition hover:-translate-y-0.5 hover:bg-[#231ea8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b25c8]">{actionLabel}</button>
      <button type="button" onClick={onClose}
        className="mt-2.5 inline-flex h-[50px] w-full items-center justify-center rounded-[14px] border border-[#dad8f2] bg-white text-[14.5px] font-bold text-[#0b0a2e] transition hover:bg-[#f6f5ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b25c8]">Close</button>
    </div>
  </div>;
}
