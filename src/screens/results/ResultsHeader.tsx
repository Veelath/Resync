import { HomeButton } from '../../components/AppPrimitives';
import type { Screen } from '../../lib/appTypes';
import { B } from '../../lib/brand';

export function ResultsHeader({ onNavigate, onBack, isSample, displayTitle }: { onNavigate: (s: Screen) => void; onBack: () => void; isSample?: boolean; displayTitle: string }) {
  return (
      <nav className="shrink-0 bg-white border-b border-gray-100 z-50 print:hidden">
        <div className="px-5 py-2 sm:py-0 sm:h-12 flex flex-wrap sm:flex-nowrap items-center gap-3">
          {isSample ? (
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium rounded-lg px-2 py-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            Back
          </button>
          ) : (
            <HomeButton onClick={() => onNavigate("dashboard")} />
          )}
          <span className="text-xs text-gray-400 truncate hidden md:block">
            {isSample ? "/ Predictors of Academic Burnout Among STEM Undergraduates" : `/ ${displayTitle}`}
          </span>
          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2 shrink-0">
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
