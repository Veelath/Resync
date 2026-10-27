import type React from 'react';
import type { DisplayScan } from '../../lib/appTypes';
import { B } from '../../lib/brand';
import { PARAGRAPHS } from '../../data/sampleReport';
import type { AssessmentType, Citation } from '../../data/sampleReport';
import { CITE_BADGE } from './helpers';
import type { MobileResultsPane, ReportSection } from './helpers';

export function ManuscriptViewer({ mobilePane, isSample, displayTitle, displayBand, findingsCount, sectionsCount, manuscriptLoading, manuscriptText, manuscriptError, localParagraphs, localCitations, privateCount, ST, renderPara, renderSectionText, renderCitation, scan }: {
  mobilePane: MobileResultsPane; isSample?: boolean; displayTitle: string; displayBand?: string; findingsCount: number; sectionsCount: number;
  manuscriptLoading: boolean; manuscriptText: string | null; manuscriptError: string | null; localParagraphs: typeof PARAGRAPHS;
  localCitations: Citation[]; privateCount: number; ST: Record<AssessmentType, { hl: string; pill: string; accentColor: string; label: string }>;
  renderPara: (para: typeof PARAGRAPHS[number]) => React.ReactNode; renderSectionText: (section: ReportSection) => React.ReactNode;
  renderCitation: (cite: Citation) => React.ReactNode; scan?: DisplayScan | null;
}) {
  return (
        <div className={`${mobilePane === "report" ? "flex" : "hidden"} print-force-visible print:block print:w-full print:h-auto print:overflow-visible print:border-none print:static lg:flex flex-1 min-w-0 overflow-y-auto bg-white flex-col`}>
          <div className="sticky top-0 z-20 px-6 lg:px-10 py-3 bg-white border-b border-gray-100 text-xs font-semibold text-gray-500 print:hidden">▤ &nbsp;Manuscript preview</div>
          <div className="w-full max-w-5xl mx-auto px-6 lg:px-10 py-10">
            <header className="mb-7 print:hidden">
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 mb-5">{isSample ? 'Sample manuscript report' : 'Manuscript report'}</p>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-slate-900 max-w-3xl text-balance" style={{ fontFamily: 'Georgia, serif' }}>{displayTitle}</h1>
              <div className="border-t border-gray-100 mt-7 pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><span aria-hidden="true">✓</span>Analysis complete</span>
                <p className="text-xs text-gray-500 mt-3">Overall assessment {displayBand && <strong className="text-amber-700">{displayBand}</strong>} <span aria-hidden="true">·</span> {findingsCount} findings across {sectionsCount} sections</p>
              </div>
            </header>
              <article className="bg-white print:hidden">
                {manuscriptLoading && <p className="text-sm text-gray-600">Loading manuscript text…</p>}
                {isSample ? localParagraphs.map((para, index) => (
                  <section key={index} id={`sec-${index}`} className="py-5 border-t border-gray-100">
                    <h2 className="font-bold text-gray-900 mb-3">{para.heading}</h2>
                    <p className="text-sm leading-7 text-gray-700">{renderPara(para)}</p>
                  </section>
                )) : manuscriptText ? (
                  <div className="whitespace-pre-wrap break-words font-serif text-sm sm:text-base leading-8 text-gray-800">
                    {renderSectionText({ key: 'full-manuscript', name: displayTitle, role: '', text: manuscriptText, status: 'Present' })}
                  </div>
                ) : !manuscriptLoading && (
                  <div className="space-y-5">
                    <p role={manuscriptError ? 'alert' : undefined} className="text-sm text-gray-600">{manuscriptError || 'Manuscript preview unavailable'} · Showing analyzed section excerpts.</p>
                    {localParagraphs.map((para, index) => (
                      <section key={index} id={`sec-${index}`} className="border-t border-gray-100 pt-4">
                        <h2 className="font-bold text-gray-900 mb-2">{para.heading}</h2>
                        <p className="text-sm leading-7 text-gray-700">{renderPara(para)}</p>
                      </section>
                    ))}
                  </div>
                )}
              </article>
            <div className="hidden print:block">
            {/* Full manuscript is independent of the selected tab when printing. */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {localParagraphs.map((para, i) => {
                const isChapterHead = para.type === "chapter-heading";
                return (
                  <div key={i}
                    id={`sec-${i}`}
                    className="scroll-mt-14">

                    {/* Divider between entries */}
                    {i > 0 && <div className={`mx-8 lg:mx-12 border-t ${isChapterHead ? "border-gray-200 my-0" : "border-gray-100 my-0"}`} />}

                    <div className={`px-8 lg:px-12 ${isChapterHead ? "pt-10 pb-0" : "pt-6 pb-0"}`}>

                      {/* Chapter label for chapter headings */}
                      {isChapterHead && (
                        <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: B }}>{para.chapter}</p>
                      )}

                      {/* Section heading row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h2 className={`font-bold tracking-tight text-gray-900 leading-snug ${isChapterHead ? "text-xl" : "text-base"}`}>
                          {para.heading}
                        </h2>
                        {/* Assessment badges inline with heading */}
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5 flex-wrap justify-end">
                          {para.assessments.length === 0
                            ? <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Aligned</span>
                            : [...new Map(para.assessments.map(pi => [pi.itemId, pi])).values()].map(pi => (
                              <span key={pi.itemId}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ST[pi.type].pill}`}>
                                {ST[pi.type].label}
                              </span>
                            ))
                          }
                        </div>
                      </div>

                      {/* Paragraph text */}
                      <p className={`text-gray-700 leading-relaxed pb-8 ${isChapterHead ? "text-[16px]" : "text-[15px]"}`}
                        style={{ lineHeight: "1.85" }}>
                        {renderPara(para)}
                      </p>

                    </div>
                  </div>
                );
              })}

              {/* References — inside the document paper */}
              {localCitations.length > 0 && (
                <>
                  <div className="mx-8 lg:mx-12 border-t border-gray-200 mt-0" />
                  <div className="px-8 lg:px-12 pt-8 pb-10" id="refs">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1 text-gray-400">References</p>
                    <div className="flex items-center gap-3 mb-5">
                      <h2 className="text-xl font-bold text-gray-900">Bibliography</h2>
                      <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"><span className="tabular-nums">{localCitations.length}</span> sources checked</span>
                      {privateCount > 0 && <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full"><span className="tabular-nums">{privateCount}</span> inaccessible</span>}
                    </div>
                    {privateCount > 0 && (
                      <div className="flex items-start gap-3 px-4 py-3 mb-4 rounded-xl border border-red-200 bg-red-50">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                        <p className="text-xs text-red-700 leading-relaxed"><span className="font-bold">{privateCount} reference{privateCount > 1 ? "s are" : " is"} private</span> or require{privateCount > 1 ? "" : "s"} permission to open. Readers and reviewers may not be able to check {privateCount > 1 ? "them" : "it"}, so consider citing a public version.</p>
                      </div>
                    )}
                    {localCitations.length > 0 ? (
                      <div className="space-y-2">
                        {localCitations.map((cite, ci) => (
                          <div key={cite.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors ${CITE_BADGE[cite.status].row}`}>
                            <span className="text-[11px] mono font-bold text-gray-400 mt-0.5 w-4 shrink-0 tabular-nums">{ci + 1}</span>
                            {renderCitation(cite)}
                            
                            <div className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${CITE_BADGE[cite.status].badge}`}>
                              {cite.status === "public" ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
                              )}
                              {CITE_BADGE[cite.status].label}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 italic">
                        No citations were detected in this manuscript ({scan?.citations_audited ?? 0} sources audited).
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>{/* end document paper */}

            </div>{/* print paper */}
          </div>
        </div>
  );
}
