import React, { useState } from 'react';
import { ScanResult, CitedReference } from '../types.js';
import { API_BASE_URL, authHeaders } from '../services/api.js';
import {
  Download, Printer, ChevronDown, ChevronUp, CheckCircle, ListTree, ShieldCheck, Gauge, Link2, ExternalLink
} from 'lucide-react';
import ScoreRing from './ScoreRing.tsx';
import { getScoreTier, downloadReport } from '../utils.js';

interface ResultDetailsProps {
  scan: ScanResult;
}

function getCitationStatusBadge(cit: CitedReference): { label: string; className: string; detail: string } {
  switch (cit.citation_status) {
    case 'verified_metadata':
      return { label: '✓ Verified', className: 'bg-emerald-100 text-emerald-800', detail: 'Confirmed against Crossref metadata — the DOI resolves to this exact work.' };
    case 'accessible':
      return { label: '✓ Accessible', className: 'bg-emerald-100 text-emerald-800', detail: 'The link responded successfully.' };
    case 'metadata_mismatch':
      return { label: '⚠ Details Mismatch', className: 'bg-amber-100 text-amber-800', detail: 'The DOI resolves, but its title/year does not match this reference — check for a wrong or mistyped DOI.' };
    case 'bot_wall':
      return { label: '⚠ Restricted', className: 'bg-amber-100 text-amber-800', detail: 'The publisher blocked automated verification (paywall or bot defense) — not necessarily broken, just unverifiable automatically.' };
    case 'broken':
      return { label: '✕ Broken', className: 'bg-rose-100 text-rose-800', detail: 'Unreachable or broken reference link.' };
    case 'no_link':
      return { label: 'No Link', className: 'bg-slate-100 text-slate-600', detail: 'This reference has no URL or DOI to verify (common for print-only sources).' };
    case 'unknown_error':
      return { label: '? Unverified', className: 'bg-slate-100 text-slate-600', detail: 'Verification failed for a transient reason — try scanning again.' };
    default: {
      // Legacy fallback for history rows saved before the status ladder existed.
      const isAccessible = cit.citation_is_accessible !== undefined ? cit.citation_is_accessible : (cit.status === 'Accessible');
      return isAccessible
        ? { label: '✓ Accessible', className: 'bg-emerald-100 text-emerald-800', detail: 'Verified accessible reference.' }
        : { label: '✕ Broken', className: 'bg-rose-100 text-rose-800', detail: 'Unreachable or broken reference link.' };
    }
  }
}

export default function ResultDetails({ scan }: ResultDetailsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'inconsistencies' | 'strong_coherence' | 'citations'>('overview');

  // Accordion state maps
  const [expandedInconsistencies, setExpandedInconsistencies] = useState<Record<number, boolean>>({});
  const [expandedCitations, setExpandedCitations] = useState<Record<number, boolean>>({});
  const [feedbackMap, setFeedbackMap] = useState<Record<number, 'up' | 'down' | null>>({});

  const toggleInconsistency = (idx: number) => {
    setExpandedInconsistencies(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleCitation = (idx: number) => {
    setExpandedCitations(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getCoherenceTier = (score: number) => {
    const tier = getScoreTier(score);
    return { label: tier.label, color: `${tier.bgColor} ${tier.textColor} ${tier.borderColor}` };
  };

  const handleDownloadReport = () => downloadReport(scan);
  const handlePrint = () => window.print();

  const displayScore = scan.coherenceScore;
  const tier = getCoherenceTier(displayScore);
  const breakdown = scan.score_breakdown;

  const inconsistenciesList = (scan.inconsistencies && scan.inconsistencies.length > 0) ? scan.inconsistencies : (scan.correlationReport && scan.correlationReport.length > 0 ? scan.correlationReport : []);

  // Mirrors services/scoring.py::PAR_SCORE. The Strong Coherence tab used
  // to read scan.section_scores (the deprecated linear adjacent-pair
  // scale, filtered at an unrelated >=70 cutoff, and never populated at
  // all for a scan reloaded from history) -- it now reads the calibrated
  // role-pair scores that actually decide what "strong" means, and
  // attaches the model's substantive-vs-superficial verification note
  // for each one.
  const PAR_SCORE = 80;
  const verificationByPair = new Map(
    (scan.verifications || []).map(v => [`${v.role_a}|${v.role_b}`, v])
  );
  const strongCoherenceList = (scan.score_breakdown?.coherence_detail?.pair_scores || [])
    .filter(p => p.included && (p.score ?? 0) >= PAR_SCORE)
    .map(p => ({
      ...p,
      verification: verificationByPair.get(`${p.role_a}|${p.role_b}`),
    }));

  const citationsList = (scan.citations && scan.citations.length > 0) ? scan.citations : (scan.references && scan.references.length > 0 ? scan.references : []);

  return (
    <div className="space-y-6 animate-fade-in text-left relative" id={`scan-report-${scan.id}`}>
      {/* Action Footer Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-4 border-b border-slate-200 justify-end">
        <button onClick={handleDownloadReport} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer">
          <Download className="w-4 h-4" />
          <span>Download</span>
        </button>
        <button onClick={handlePrint} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer">
          <Printer className="w-4 h-4" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Custom Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        {[ 
          { id: 'overview', label: 'Overview' },
          { id: 'inconsistencies', label: `Inconsistencies (${inconsistenciesList.length})` },
          { id: 'strong_coherence', label: `Strong Coherence (${strongCoherenceList.length})` },
          { id: 'citations', label: `Citations (${citationsList.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 -mb-[2px] transition-all cursor-pointer ${activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono mb-2.5">Coherence Score</span>
                <ScoreRing score={displayScore} size={150} strokeWidth={12} />
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">Summary</span>
                <p className="text-sm text-slate-700 leading-relaxed">{scan.overallAssessment}</p>
                {scan.missingSections && scan.missingSections.length > 0 && (
                  <div className="mt-4 bg-rose-50/30 border border-rose-250 rounded-xl p-4">
                    <span className="text-xs font-bold text-rose-800 uppercase block mb-2">Missing Sections:</span>
                    <div className="flex flex-wrap gap-2">
                      {scan.missingSections.map((sec, idx) => (
                        <span key={idx} className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-1 rounded-lg">⚠️ {sec}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Functional Metric Criteria Breakdown */}
            {breakdown && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-655">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Score Criteria
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                    {breakdown.band}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Structural Completeness', value: breakdown.structural_completeness_score },
                    { label: 'Cross-Chapter Coherence', value: breakdown.cross_chapter_coherence_score },
                    { label: 'Citation Integrity', value: breakdown.citation_integrity_score },
                  ].map((c) => (
                    <div key={c.label} className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{c.label}</span>
                      {c.value == null ? (
                        <p className="text-sm text-slate-400 italic">Not evaluable</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${c.value >= 70 ? 'bg-emerald-500' : c.value >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.max(4, c.value)}%` }}
                            />
                          </div>
                          <span className="text-sm font-extrabold text-slate-800 font-mono w-10 text-right">{Math.round(c.value)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {breakdown.biggest_lever && (
                  <div className="bg-indigo-50/40 border border-indigo-150 rounded-xl p-4 flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide block mb-0.5">
                        Biggest lever: {breakdown.biggest_lever.criterion.replace(/_/g, ' ')}
                      </span>
                      <p className="text-sm text-indigo-950">{breakdown.biggest_lever.reason}</p>
                      <p className="text-xs text-indigo-600 mt-1">
                        Fixing this could gain up to {breakdown.biggest_lever.potential_point_gain} points.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Detected Sections Panel */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-655">
                    <ListTree className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    Detected Sections {scan.sections_analyzed ? `(${scan.sections_analyzed.length})` : ''}
                  </span>
                </div>
                {scan.auto_detected != null && scan.detection_confidence != null && (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-lg self-start sm:self-auto">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Auto-detected &middot; {Math.round(scan.detection_confidence * 100)}% confidence
                  </span>
                )}
              </div>

              {scan.sections_analyzed && scan.sections_analyzed.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {scan.sections_analyzed.map((sec, idx) => (
                    <span key={idx} className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                      {sec}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-450">No section breakdown was returned for this scan.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INCONSISTENCIES (Accordions & XAI) */}
        {activeTab === 'inconsistencies' && (
          <div className="space-y-4">
            {inconsistenciesList.map((inc, idx) => {
              const isExpanded = expandedInconsistencies[idx];
              const secA = inc.section_a || inc.sectionA || `Section A`;
              const secB = inc.section_b || inc.sectionB || `Section B`;
              const whatText = inc.explanation_what || inc.description || "Inconsistency found.";
              const whyText = inc.explanation_why || "Logical disconnect.";
              const fixText = inc.suggested_fix || inc.howToFix || "Harmonize text.";

              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <button onClick={() => toggleInconsistency(idx)} className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Flag {idx + 1}</span>
                      <span className="text-sm font-bold text-slate-800">{secA} ↔ {secB}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </button>
                  
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-200 space-y-4 text-sm leading-relaxed text-slate-700">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-150">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">🔍 What Was Found:</span>
                        <p>{whatText}</p>
                      </div>
                      <div className="bg-amber-50/40 rounded-lg p-3 border border-amber-200/60 text-amber-900">
                        <span className="text-[10px] font-bold text-amber-700 uppercase block mb-1">💡 Why It Matters:</span>
                        <p>{whyText}</p>
                      </div>
                      <div className="border-l-4 border-indigo-500 pl-4 py-2 text-indigo-950">
                        <span className="text-[10px] font-bold text-indigo-700 uppercase block mb-1">🛠️ Suggested Fix:</span>
                        <p className="font-medium text-base">{fixText}</p>
                      </div>
                      {/* Evidence Citation Block */}
                      {(inc.evidence_a || inc.evidence_b) && (
                        <div className="bg-indigo-50/30 rounded-lg p-3 border border-indigo-100 mt-1">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-2 flex items-center gap-2">
                            📎 Grounding Evidence:
                            {inc.evidence_verified === false && (
                              <span className="text-[9px] font-bold normal-case bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded" title="This quote could not be re-verified against the source section text.">
                                unverified
                              </span>
                            )}
                          </span>
                          {inc.evidence_a && (
                            <p className="italic text-slate-600 text-xs border-l-2 border-indigo-300 pl-3 mb-2">
                              <span className="font-bold not-italic text-indigo-500">Section A: </span>&ldquo;{inc.evidence_a}&rdquo;
                            </p>
                          )}
                          {inc.evidence_b && (
                            <p className="italic text-slate-600 text-xs border-l-2 border-rose-300 pl-3">
                              <span className="font-bold not-italic text-rose-500">Section B: </span>&ldquo;{inc.evidence_b}&rdquo;
                            </p>
                          )}
                        </div>
                      )}

                      {/* Unaddressed Objectives Block */}
                      {inc.objectives_unaddressed && inc.objectives_unaddressed.length > 0 && (
                        <div className="bg-amber-50/40 rounded-lg p-3 border border-amber-200/60">
                          <span className="text-[10px] font-bold text-amber-700 uppercase block mb-2">⚠️ Unaddressed Objectives:</span>
                          <ul className="list-disc list-inside space-y-1">
                            {inc.objectives_unaddressed.map((obj, i) => (
                              <li key={i} className="text-xs text-amber-900 italic">{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Feedback Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-2">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Was this helpful?</span>
                        <button
                          disabled={feedbackMap[idx] != null}
                          onClick={async () => {
                            const issueId = inc.inconsistency_id;
                            const userId = scan.user_id || scan.userId || '';
                            const apiBase = API_BASE_URL;
                            setFeedbackMap(prev => ({ ...prev, [idx]: 'up' }));
                            if (issueId) {
                              fetch(`${apiBase}/api/issues/${issueId}/feedback`, {
                                method: 'POST',
                                headers: await authHeaders({ 'Content-Type': 'application/json', 'X-User-Id': userId }),
                                body: JSON.stringify({ helpful: true }),
                              }).catch(() => {});
                            }
                          }}
                          className={`text-lg px-2 py-0.5 rounded transition-all ${
                            feedbackMap[idx] === 'up'
                              ? 'bg-indigo-100 text-indigo-600 opacity-60 cursor-not-allowed'
                              : feedbackMap[idx] === 'down'
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:bg-indigo-50 cursor-pointer'
                          }`}
                          title="Helpful"
                        >👍</button>
                        <button
                          disabled={feedbackMap[idx] != null}
                          onClick={async () => {
                            const issueId = inc.inconsistency_id;
                            const userId = scan.user_id || scan.userId || '';
                            const apiBase = API_BASE_URL;
                            setFeedbackMap(prev => ({ ...prev, [idx]: 'down' }));
                            if (issueId) {
                              fetch(`${apiBase}/api/issues/${issueId}/feedback`, {
                                method: 'POST',
                                headers: await authHeaders({ 'Content-Type': 'application/json', 'X-User-Id': userId }),
                                body: JSON.stringify({ helpful: false }),
                              }).catch(() => {});
                            }
                          }}
                          className={`text-lg px-2 py-0.5 rounded transition-all ${
                            feedbackMap[idx] === 'down'
                              ? 'bg-rose-100 text-rose-600 opacity-60 cursor-not-allowed'
                              : feedbackMap[idx] === 'up'
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:bg-rose-50 cursor-pointer'
                          }`}
                          title="Not helpful"
                        >👎</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {inconsistenciesList.length === 0 && <p className="text-slate-500 text-sm">No inconsistencies detected.</p>}
          </div>
        )}

        {/* TAB 3: STRONG COHERENCE */}
        {activeTab === 'strong_coherence' && (
          <div className="space-y-4">
            {strongCoherenceList.map((item, idx) => {
              const isSuperficial = item.verification?.alignment === 'superficial';
              return (
                <div
                  key={idx}
                  className={`border rounded-xl p-5 shadow-xs flex flex-col gap-2 ${isSuperficial ? 'bg-amber-50/30 border-amber-200' : 'bg-emerald-50/30 border-emerald-200'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-5 h-5 ${isSuperficial ? 'text-amber-600' : 'text-emerald-600'}`} />
                    <span className={`text-sm font-bold ${isSuperficial ? 'text-amber-900' : 'text-emerald-900'}`}>{item.role_a} ↔ {item.role_b}</span>
                    {item.verification && (
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isSuperficial ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                        {item.verification.alignment}
                      </span>
                    )}
                    <span className={`ml-auto text-xs font-bold px-2 py-1 rounded ${isSuperficial ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>Score: {item.score}</span>
                  </div>
                  {item.verification?.note && (
                    <p className={`text-sm leading-relaxed ml-7 ${isSuperficial ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {item.verification.note}
                    </p>
                  )}
                  {!item.verification && (
                    <p className="text-sm text-slate-500 leading-relaxed ml-7">Verification pending or unavailable for this pair.</p>
                  )}
                </div>
              );
            })}
            {strongCoherenceList.length === 0 && <p className="text-slate-500 text-sm">No strong coherence links reported.</p>}
          </div>
        )}

        {/* TAB 4: CITATIONS (Accordions) */}
        {activeTab === 'citations' && (
          <div className="space-y-4">
            {citationsList.map((cit, idx) => {
              const isExpanded = expandedCitations[idx];
              const rawText = cit.citation_raw_reference_text || cit.citation || "Reference entry";
              const badge = getCitationStatusBadge(cit);

              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <button onClick={() => toggleCitation(idx)} className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer">
                    <div className="flex items-start gap-3 w-4/5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-0.5 shrink-0 ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-sm font-bold text-slate-800 truncate">{rawText}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="p-5 border-t border-slate-200 text-sm leading-relaxed text-slate-700 space-y-3">
                      <div>
                        <p className="font-sans mb-2 text-slate-500 text-xs uppercase font-bold tracking-wider">Citation Details</p>
                        <p className="font-serif whitespace-pre-wrap break-words">{rawText}</p>
                      </div>
                      <p className="text-xs text-slate-500 font-sans">{badge.detail}</p>
                      {cit.citation_primary_link && (
                        <a
                          href={cit.citation_primary_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span className="truncate max-w-xs">{cit.citation_primary_link}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {cit.citation_crossref_title && cit.citation_status === 'metadata_mismatch' && (
                        <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3">
                          <span className="text-[10px] font-bold text-amber-700 uppercase block mb-1">Crossref found a different work at this DOI:</span>
                          <p className="text-xs text-amber-900 italic">&ldquo;{cit.citation_crossref_title}&rdquo;</p>
                        </div>
                      )}
                      {cit.citation_is_cited_in_text === false && (
                        <p className="text-xs text-slate-500 font-sans">⚠️ This reference was not found cited anywhere in the manuscript body.</p>
                      )}
                      {cit.explanation && <p className="mt-1 text-sm font-sans text-slate-500 bg-slate-50 p-3 rounded">{cit.explanation}</p>}
                    </div>
                  )}
                </div>
              );
            })}
            {citationsList.length === 0 && <p className="text-slate-500 text-sm">No citations detected.</p>}
          </div>
        )}

      </div>
    </div>
  );
}
