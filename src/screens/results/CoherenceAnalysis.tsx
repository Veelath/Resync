import type React from 'react';

export function CoherenceAnalysis({ analysisExpanded, setAnalysisExpanded, analysisTab, setAnalysisTab, recommendations, synthesis, strongestAlignment, needsAttention, children }: {
  analysisExpanded: boolean; setAnalysisExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  analysisTab: 'synthesis' | 'recommendations'; setAnalysisTab: (value: 'synthesis' | 'recommendations') => void;
  recommendations: Array<{ id: string; section?: string; quote: string | null; revision?: string }>; synthesis?: string | null;
  strongestAlignment?: { title: string }; needsAttention?: { title: string }; children: React.ReactNode;
}) {
  return (
          <section className="border-b border-gray-100">
            <button type="button" className="w-full flex items-center gap-3 px-5 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" aria-expanded={analysisExpanded} aria-controls="coherence-analysis-content" onClick={() => setAnalysisExpanded(value => !value)}>
              <span className="size-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg" aria-hidden="true">✦</span>
              <span className="flex-1"><span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Analysis</span><span className="block text-base font-bold text-slate-900">Coherence analysis</span></span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`size-4 text-gray-500 transition-transform ${analysisExpanded ? '' : '-rotate-90'}`} aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {analysisExpanded && <div id="coherence-analysis-content">
              <div role="tablist" aria-label="Coherence analysis tabs" className="flex border-y border-gray-100 px-4 overflow-x-auto">
                {([['synthesis', 'AI synthesis', null], ['recommendations', 'Recommendations', recommendations.length]] as const).map(([id, label, count], index) => (
                  <button key={id} type="button" role="tab" aria-selected={analysisTab === id} aria-controls="analysis-tab-panel" id={`analysis-tab-${id}`} tabIndex={analysisTab === id ? 0 : -1} onClick={() => setAnalysisTab(id)} onKeyDown={event => {
                    const tabs = ['synthesis', 'recommendations'] as const;
                    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
                    if (next < 0) return;
                    event.preventDefault();
                    setAnalysisTab(tabs[next]);
                    document.getElementById(`analysis-tab-${tabs[next]}`)?.focus();
                  }} className={`px-3 py-3 text-xs font-bold whitespace-nowrap border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${analysisTab === id ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-900'}`}>{label}{count !== null && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 tabular-nums">{count}</span>}</button>
                ))}
              </div>
              <div role="tabpanel" id="analysis-tab-panel" aria-labelledby={`analysis-tab-${analysisTab}`} className="px-5 py-6">
                {analysisTab === 'synthesis' && <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Summary</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{synthesis || 'Summary unavailable for this scan'}</p>
          <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-1 gap-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-2.5">
              <span className="text-emerald-700 text-base leading-none" aria-hidden="true">✓</span>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-emerald-900">Strongest pair</h4>
                <p className="text-xs text-emerald-800 truncate" title={strongestAlignment?.title}>{strongestAlignment?.title || "No scored pair"}</p>
              </div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-start gap-2.5">
              <span className="text-rose-700 text-base leading-none" aria-hidden="true">!</span>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-rose-900">Weakest pair</h4>
                <p className="text-xs text-rose-800 truncate" title={needsAttention?.title}>{needsAttention?.title || "No scored pair"}</p>
              </div>
            </div>
          </div>

                </div>}
                {analysisTab === 'recommendations' && <div className="space-y-4">
                  {recommendations.length ? recommendations.map((recommendation, index) => (
                    <div key={recommendation.id} className="flex items-start gap-3">
                      <span className="rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-bold px-2 py-1.5 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                      <div className="min-w-0 flex-1 rounded-xl bg-gray-50 p-3 space-y-2">
                        {recommendation.section && <p className="text-xs font-semibold text-gray-600">{recommendation.section}</p>}
                        <div className="rounded-lg bg-gray-100 p-3"><p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">Original sentence</p><p className="text-xs text-gray-700 leading-relaxed">“{recommendation.quote || 'Verified source sentence unavailable'}”</p></div>
                        <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3"><p className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 mb-1">Recommended revision</p><p className="text-xs text-gray-700 leading-relaxed">{recommendation.revision}</p></div>
                      </div>
                    </div>
                  )) : <p className="text-sm text-gray-500">No recommendations for this scan.</p>}
                </div>}
              </div>
              <div className="border-t border-gray-100">
            {children}
              </div>
            </div>}
          </section>
  );
}
