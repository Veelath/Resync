import { Logo } from '../../components/AppPrimitives';
import type { Screen } from '../../lib/appTypes';
import { B } from '../../lib/brand';

export function ResultsHeader({ onNavigate, isSample, displayTitle, setShowPairingModal }: { onNavigate: (s: Screen) => void; isSample?: boolean; displayTitle: string; setShowPairingModal: (value: boolean) => void }) {
  return (
      <nav className="shrink-0 bg-white border-b border-gray-100 z-50 print:hidden">
        <div className="px-5 py-2 sm:py-0 sm:h-12 flex flex-wrap sm:flex-nowrap items-center gap-3">
          <button onClick={() => onNavigate("home")} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 font-medium transition-colors shrink-0 rounded px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Home
          </button>
          <div className="h-4 w-px bg-gray-200 shrink-0" />
          <Logo className="h-6 w-auto shrink-0" />
          <span className="text-xs text-gray-400 truncate hidden md:block">
            {isSample ? "/ Predictors of Academic Burnout Among STEM Undergraduates" : `/ ${displayTitle}`}
          </span>
          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPairingModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              How Pairing Works
            </button>
            {!isSample && (
              <>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>Export PDF
                </button>
                <button onClick={() => onNavigate("upload")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors duration-150 hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 cursor-pointer" style={{ background: B }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>New Scan
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
  );
}
