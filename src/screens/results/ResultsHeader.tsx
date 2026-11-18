import type { Screen } from '../../lib/appTypes';
import { SAMPLE_PAPERS } from '../../data/sampleReport';

export function ResultsHeader({ onNavigate, onBack, isSample, displayTitle, onDownload, onClose, sampleId, onSampleChange }: { onNavigate: (s: Screen) => void; onBack: () => void; isSample?: boolean; displayTitle: string; onDownload: () => void; onClose?: () => void; sampleId?: string; onSampleChange?: (id: string) => void }) {
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
        {isSample && onSampleChange && <label className="flex items-center gap-2 text-sm font-semibold text-[#4b5275]">
          <span className="hidden sm:inline">Sample paper</span>
          <select value={sampleId} onChange={event => onSampleChange(event.target.value)} className="rounded-lg border border-[#d9d7f7] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#0b0f3d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1fcc]">
            {SAMPLE_PAPERS.map(paper => <option key={paper.id} value={paper.id}>{paper.label}</option>)}
          </select>
        </label>}
        <span className="rp-slash hidden md:block" aria-hidden="true">/</span>
        <span className="rp-crumb hidden md:block">{displayTitle}</span>
        {(
          <div className="rp-actions">
            <button type="button" onClick={onDownload} className="rp-pill rp-ghost">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true"><path d="M12 4v12" /><path d="M7 11l5 5 5-5" /><path d="M4 18v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1" /></svg>
              Download PDF
            </button>
            {!isSample && <button type="button" onClick={() => onNavigate('upload')} className="rp-pill rp-solid">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              New scan
            </button>}
            {onClose && <button type="button" onClick={onClose} className="rp-pill rp-ghost" aria-label="Close this report">Close</button>}
          </div>
        )}
      </div>

    </nav>
  );
}
