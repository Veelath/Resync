import type React from 'react';
import type { DisplayScan } from '../../lib/appTypes';
import type { Citation } from '../../data/sampleReport';
import { CITE_BADGE } from './helpers';

export function CitationsTab({ citationFilter, setCitationFilter, displayedCitations, citationsCount, citeCount, renderCitation, scan }: {
  citationFilter: Citation["status"] | null; setCitationFilter: React.Dispatch<React.SetStateAction<Citation["status"] | null>>;
  displayedCitations: Citation[]; citationsCount: number; citeCount: (status: Citation["status"]) => number;
  renderCitation: (cite: Citation) => React.ReactNode; scan?: DisplayScan | null;
}) {
  return (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">Click any status card to filter the list. Click it again to clear.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['live', 'restricted', 'neutral', 'dead'] as Citation["status"][]).map(s => {
                    const isSelected = citationFilter === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setCitationFilter(prev => prev === s ? null : s)}
                        className={`rounded-xl border px-4 py-3 text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] mono font-bold uppercase tracking-wider text-gray-600">{CITE_BADGE[s].label}</p>
                          {isSelected && (
                            <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xl font-black text-gray-900 mt-0.5">{citeCount(s)}</p>
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-500">Restricted = paywalled · Neutral = couldn't verify.</p>

                {citationFilter && (
                  <div className="flex items-center justify-between px-3.5 py-2 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs">
                    <span className="text-indigo-950 font-medium">
                      Filtering by: <strong className="font-bold uppercase tracking-wider">{CITE_BADGE[citationFilter].label}</strong> ({displayedCitations.length} of {citationsCount})
                    </span>
                    <button
                      type="button"
                      onClick={() => setCitationFilter(null)}
                      className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer"
                    >
                      Show All
                    </button>
                  </div>
                )}

                {displayedCitations.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 px-6 py-10 text-center">
                    <p className="text-sm font-bold text-gray-800 mb-1">
                      {citationFilter ? `No ${CITE_BADGE[citationFilter].label.toLowerCase()} citations` : "No citations to show"}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      {citationFilter
                        ? `No citations with status "${CITE_BADGE[citationFilter].label}" were found.`
                        : `No citations were detected in this manuscript (${scan?.citations_audited ?? 0} sources audited).`}
                    </p>
                    {citationFilter && (
                      <button
                        type="button"
                        onClick={() => setCitationFilter(null)}
                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Show all citations
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayedCitations.map((cite, ci) => (
                      <div key={cite.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${CITE_BADGE[cite.status].row}`}>
                        <span className="text-[11px] mono font-bold text-gray-400 mt-0.5 w-5 shrink-0">{ci + 1}</span>
                        {renderCitation(cite)}
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${CITE_BADGE[cite.status].badge}`}>
                          {CITE_BADGE[cite.status].label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
  );
}
