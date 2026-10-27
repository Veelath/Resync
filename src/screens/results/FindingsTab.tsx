import type React from 'react';
import type { AssessmentItem, AssessmentType } from '../../data/sampleReport';
import { formatRoleLabel } from '../../utils.js';

export function FindingsTab({ visibleInconsistencies, toggleAllExpanded, allExpanded, inconsistenciesCount, expandedIssueIds, toggleIssueExpanded, ST, renderFeedback }: {
  visibleInconsistencies: AssessmentItem[]; toggleAllExpanded: () => void; allExpanded: boolean; inconsistenciesCount: number;
  expandedIssueIds: Set<string>; toggleIssueExpanded: (id: string) => void;
  ST: Record<AssessmentType, { hl: string; pill: string; accentColor: string; label: string }>;
  renderFeedback: (item: AssessmentItem) => React.ReactNode;
}) {
  return (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                  <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">
                    All Findings ({visibleInconsistencies.length})
                  </p>
                  <div className="flex items-center gap-3">
                    {visibleInconsistencies.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleAllExpanded}
                        className="text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 px-2.5 py-1 rounded-lg bg-white hover:bg-gray-50 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        {allExpanded ? "Collapse All" : "Expand All"}
                      </button>
                    )}
                  </div>
                </div>

                {visibleInconsistencies.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 px-6 py-10 text-center">
                    <p className="text-sm font-bold text-gray-800 mb-1">No findings to show</p>
                    <p className="text-xs text-gray-500">
                      {inconsistenciesCount === 0
                        ? 'No findings were detected across the analyzed sections.'
                        : 'No findings match the selected filter.'}
                    </p>
                  </div>
                ) : (
                  visibleInconsistencies.map((item, idx) => {
                    const isExpanded = expandedIssueIds.has(item.id);
                    return (
                      <div key={item.id} className="bg-white rounded-2xl border border-gray-200">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={`finding-content-${item.id}`}
                          onClick={() => toggleIssueExpanded(item.id)}
                          className="w-full p-4 sm:p-5 flex items-start justify-between gap-3 text-left cursor-pointer"
                        >
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ST[item.type].pill}`}>{ST[item.type].label}</span>
                              <span className="text-xs mono font-bold text-gray-400">#{idx + 1}</span>
                              {item.isMissingSection ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-800">
                                  Missing Section
                                </span>
                              ) : (
                                <span className="text-xs font-semibold" style={{ color: ST[item.type].accentColor }}>{item.section}</span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 leading-snug">{item.title}</h3>
                          </div>
                          <div className="shrink-0 p-1 text-gray-400 hover:text-gray-600">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true">
                              <path d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {isExpanded && (
                          <div id={`finding-content-${item.id}`} className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 space-y-3 border-t border-gray-100">
                            {!item.isMissingSection && item.explanation_what && (
                              <div className="mt-3 space-y-1">
                                <p className="text-[10px] mono font-bold uppercase tracking-wider text-gray-500">What was found</p>
                                <p className="text-[13px] text-gray-700 leading-relaxed">{item.explanation_what}</p>
                              </div>
                            )}
                            {item.description && (item.isMissingSection ? (
                              <p className="text-[13px] text-gray-700 leading-relaxed mt-3">{item.description}</p>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-[10px] mono font-bold uppercase tracking-wider text-gray-500">Why it matters</p>
                                <p className="text-[13px] text-gray-700 leading-relaxed">{item.description}</p>
                              </div>
                            ))}
                            {!item.isMissingSection && item.evidence && item.conflictQuote && (
                              <div className="rounded-xl bg-emerald-50/50 border border-emerald-200 p-3 space-y-2">
                                <p className="text-[10px] mono font-bold uppercase tracking-wider text-emerald-800">Grounding Evidence</p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="bg-white rounded-lg border border-emerald-200/80 p-3">
                                    <p className="text-[10px] mono font-bold uppercase tracking-wider text-gray-500 mb-1">{formatRoleLabel(item.section_a || item.section)}</p>
                                    <p className="text-xs text-gray-700 italic leading-relaxed">"{item.evidence}"</p>
                                  </div>
                                  <div className="bg-white rounded-lg border border-emerald-200/80 p-3">
                                    <p className="text-[10px] mono font-bold uppercase tracking-wider text-gray-500 mb-1">{formatRoleLabel(item.conflictsWith || item.section)}</p>
                                    <p className="text-xs text-gray-700 italic leading-relaxed">"{item.conflictQuote}"</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {!item.isMissingSection && !!item.objectives_unaddressed?.length && (
                              <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
                                <p className="text-[10px] mono font-bold uppercase tracking-wider text-gray-500 mb-1">Unachieved Objectives</p>
                                <ol className="list-decimal pl-5 space-y-1 text-xs text-gray-700 leading-relaxed">
                                  {item.objectives_unaddressed.map((objective, objectiveIndex) => <li key={`${objectiveIndex}-${objective}`}>{objective}</li>)}
                                </ol>
                              </div>
                            )}
                            {item.recommendation && (
                              <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3">
                                <p className="text-[10px] mono font-bold uppercase tracking-wider text-indigo-800 mb-1">Suggested fix</p>
                                <p className="text-xs text-indigo-950 font-medium leading-relaxed">{item.recommendation}</p>
                              </div>
                            )}
                            {renderFeedback(item)}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
  );
}
