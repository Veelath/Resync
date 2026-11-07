import type { Screen } from '../../lib/appTypes';

export function ResultsHeader({ onNavigate, onBack, isSample, displayTitle }: { onNavigate: (s: Screen) => void; onBack: () => void; isSample?: boolean; displayTitle: string }) {
  return (
    <nav className="rp-header shrink-0 z-50 print:hidden">
      <div className="rp-header-row">
        {isSample ? (
          <button type="button" onClick={onBack} className="rp-pill rp-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            Back
          </button>
        ) : (
          <button type="button" onClick={() => onNavigate('dashboard')} aria-label="Home" className="rp-pill rp-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17" aria-hidden="true"><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /></svg>
            Home
          </button>
        )}
        {isSample && <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-900">Sample report</span>}
        <span className="rp-slash hidden md:block" aria-hidden="true">/</span>
        <span className="rp-crumb hidden md:block">{displayTitle}</span>
        {!isSample && (
          <div className="rp-actions">
            <button type="button" onClick={() => { const previous = document.title; document.title = `ReSync report - ${displayTitle}`.slice(0, 120); window.addEventListener('afterprint', () => { document.title = previous; }, { once: true }); window.print(); }} className="rp-pill rp-ghost">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true"><path d="M12 4v12" /><path d="M7 11l5 5 5-5" /><path d="M4 18v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1" /></svg>
              Download PDF
            </button>
            <button type="button" onClick={() => onNavigate('upload')} className="rp-pill rp-solid">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              New scan
            </button>
          </div>
        )}
      </div>
      <p className="px-4 pb-2 text-sm text-slate-700">References and very short sections are not compared.</p>
    </nav>
  );
}
