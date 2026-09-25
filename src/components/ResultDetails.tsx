import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ScanResult, CitedReference, Verification, ManuscriptPreviewResponse } from '../types.js';
import { API_BASE_URL, authHeaders, fetchManuscriptPreview } from '../services/api.js';
import { generateHighlightedText, HighlightTarget } from '../highlight.js';

import {
  Download, Printer, ChevronDown, ChevronUp, CheckCircle, ListTree, ShieldCheck, Gauge, Link2, ExternalLink, AlertTriangle, Info
} from 'lucide-react';
import ScoreRing from './ScoreRing.tsx';
import { getScoreTier, downloadReport, computeRevisionPlan, formatRoleLabel, PAR_SCORE } from '../utils.js';

interface ResultDetailsProps {
  scan: ScanResult;
}

function getCitationStatusBadge(cit: CitedReference): { label: string; className: string; detail: string } {
  switch (cit.citation_status) {
    case 'verified_metadata':
      return { label: 'âœ“ Verified', className: 'bg-emerald-100 text-emerald-800', detail: 'Confirmed against Crossref metadata â€” the DOI resolves to this exact work.' };
    case 'accessible':
      return { label: 'âœ“ Accessible', className: 'bg-emerald-100 text-emerald-800', detail: 'The link responded successfully.' };
    case 'metadata_mismatch':
      return { label: 'âš  Details Mismatch', className: 'bg-amber-100 text-amber-800', detail: 'The DOI resolves, but its title/year does not match this reference â€” check for a wrong or mistyped DOI.' };
    case 'bot_wall':
      return { label: 'âš  Restricted', className: 'bg-amber-100 text-amber-800', detail: 'The publisher blocked automated verification (paywall or bot defense) â€” not necessarily broken, just unverifiable automatically.' };
    case 'broken':
      return { label: 'âœ• Broken', className: 'bg-rose-100 text-rose-800', detail: 'Unreachable or broken reference link.' };
    case 'no_link':
      return { label: 'No Link', className: 'bg-slate-100 text-slate-600', detail: 'This reference has no URL or DOI to verify (common for print-only sources).' };
    case 'unknown_error':
      return { label: '? Unverified', className: 'bg-slate-100 text-slate-600', detail: 'Verification failed for a transient reason â€” try scanning again.' };
    default: {
      // Legacy fallback for history rows saved before the status ladder existed.
      const isAccessible = cit.citation_is_accessible !== undefined ? cit.citation_is_accessible : (cit.status === 'Accessible');
      return isAccessible
        ? { label: 'âœ“ Accessible', className: 'bg-emerald-100 text-emerald-800', detail: 'Verified accessible reference.' }
        : { label: 'âœ• Broken', className: 'bg-rose-100 text-rose-800', detail: 'Unreachable or broken reference link.' };
    }
  }
}

const DEFAULT_AI_TEXT_DISCLAIMER =
  'Advisory only, not an academic-integrity determination. This is a stylometric heuristic over surface features and cannot verify authorship. Well-written human academic prose commonly scores 40-60 on this scale; this indicator must never be used to block a submission or as an integrity charge on its own.';

export default function ResultDetails({ scan }: ResultDetailsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'inconsistencies' | 'strong_coherence' | 'citations' | 'originality'>('overview');

  // Two-pane state
  const [manuscript, setManuscript] = useState<ManuscriptPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const leftPaneVirtuosoRef = useRef<any>(null);

  useEffect(() => {
    async function loadManuscript() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const nocache = urlParams.get('nocache') === '1';
        const result = await fetchManuscriptPreview(scan.analysis_run_id || scan.id, nocache);
        setManuscript(result);
      } catch (err) {
        setManuscript({ available: false, reason: 'unreachable' });
      } finally {
        setLoading(false);
      }
    }
    loadManuscript();
  }, [scan.analysis_run_id, scan.id]);

  const strengths = useMemo(() => {
    return (scan.verifications || []).filter(v => v.alignment === 'substantive');
  }, [scan.verifications]);

  const highlightTargets = useMemo(() => {
    const targets: HighlightTarget[] = [];
    const inconsistenciesList = (scan.inconsistencies && scan.inconsistencies.length > 0) ? scan.inconsistencies : (scan.correlationReport && scan.correlationReport.length > 0 ? scan.correlationReport : []);
    inconsistenciesList.forEach(issue => {
      const severity = issue.severity?.toLowerCase() || 'medium';
      if (issue.evidence_a) targets.push({ id: issue.inconsistency_id || issue.section_a || '', quote: issue.evidence_a, severity: severity as any });
      if (issue.evidence_b) targets.push({ id: issue.inconsistency_id || issue.section_b || '', quote: issue.evidence_b, severity: severity as any });
    });
    return targets;
  }, [scan.inconsistencies, scan.correlationReport]);

  const highlightedNodes = useMemo(() => {
    if (manuscript && 'available' in manuscript && manuscript.available) {
      return generateHighlightedText(manuscript.text, highlightTargets);
    }
    return [];
  }, [manuscript, highlightTargets]);

  const scrollToCard = (id: string) => {
    if (rightPaneRef.current) {
      const card = rightPaneRef.current.querySelector(`[data-issue-id="${id}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('ring-2', 'ring-indigo-500', 'transition-all');
        setTimeout(() => card.classList.remove('ring-2', 'ring-indigo-500'), 1500);
      }
    }
  };

  const scrollToHighlight = (id: string) => {
    if (leftPaneVirtuosoRef.current) {
      const index = highlightedNodes.findIndex(n => n.type === 'highlight' && n.targetId === id);
      if (index !== -1) {
        leftPaneVirtuosoRef.current.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
      }
    }
  };

  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-200 text-red-900 cursor-pointer hover:bg-red-300';
      case 'medium': return 'bg-amber-200 text-amber-900 cursor-pointer hover:bg-amber-300';
      case 'low': return 'bg-green-200 text-green-900 cursor-pointer hover:bg-green-300';
      default: return 'bg-yellow-200 text-yellow-900 cursor-pointer hover:bg-yellow-300';
    }
  };

  // Accordion state maps
  const [expandedInconsistencies, setExpandedInconsistencies] = useState<Record<number, boolean>>({});
  const [expandedCitations, setExpandedCitations] = useState<Record<number, boolean>>({});
  const [feedbackMap, setFeedbackMap] = useState<Record<number, 'up' | 'down' | null>>({});

  // While true, every tab renders at once and every accordion is forced
  // open -- window.print() only captures what's in the DOM, and React's
  // conditional tab/accordion rendering means an unopened tab is never
  // there to print. Reset on the browser's own afterprint event so this
  // also recovers if printing was cancelled or triggered via Ctrl+P.
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const reset = () => setIsPrinting(false);
    window.addEventListener('afterprint', reset);
    return () => window.removeEventListener('afterprint', reset);
  }, []);

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
  const handlePrint = () => {
    setIsPrinting(true);
    // Double rAF: give React a full commit+paint cycle to render every
    // section/accordion open before the browser captures the print layout.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  };

  const displayScore = scan.coherenceScore;
  const tier = getCoherenceTier(displayScore);
  const breakdown = scan.score_breakdown;
  const revisionPlan = computeRevisionPlan(scan);

  const inconsistenciesList = (scan.inconsistencies && scan.inconsistencies.length > 0) ? scan.inconsistencies : (scan.correlationReport && scan.correlationReport.length > 0 ? scan.correlationReport : []);

  // Every included role-pair, strong and weak alike -- previously filtered
  // to >= PAR_SCORE only, which kept the praise on screen and quietly
  // dropped the pairs that actually need attention.
  const verificationByPair = new Map(
    (scan.verifications || []).map(v => [`${v.role_a}|${v.role_b}`, v])
  );
  const allPairs = (breakdown?.coherence_detail?.pair_scores || [])
    .filter(p => p.included)
    .map(p => ({
      ...p,
      verification: verificationByPair.get(`${p.role_a}|${p.role_b}`),
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const strongPairs = allPairs.filter(p => (p.score ?? 0) >= PAR_SCORE);
  const weakPairs = allPairs.filter(p => (p.score ?? 0) < PAR_SCORE);
  const dismissedPairs = breakdown?.coherence_detail?.dismissed_pairs || [];

  const citationsList = (scan.citations && scan.citations.length > 0) ? scan.citations : (scan.references && scan.references.length > 0 ? scan.references : []);

  const stubSections = breakdown?.structural_detail?.stub_sections || [];
  const unevaluableFraction = breakdown?.coherence_detail?.unevaluable_weight_fraction;

  const aiText = scan.ai_text_indicator;
  const showOriginalityTab = aiText?.overall_score != null;

  const tabs: Array<{ id: typeof activeTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'inconsistencies', label: `Inconsistencies (${inconsistenciesList.length})` },
    { id: 'strong_coherence', label: `Coherence Pairs (${allPairs.length})` },
    { id: 'citations', label: `Citations (${citationsList.length})` },
    ...(showOriginalityTab ? [{ id: 'originality' as const, label: 'Writing Style' }] : []),
  ];

  const shouldShow = (id: typeof activeTab) => isPrinting || activeTab === id;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" id={`scan-report-${scan.id}`}>
      {/* LEFT PANE: Manuscript Preview */}
      <div className="w-1/2 h-full overflow-y-auto font-serif text-sm border-r border-slate-200 bg-white flex flex-col print:hidden">
        <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm flex justify-between items-center">
          <h2 className="font-bold text-slate-800">Manuscript Preview</h2>
          <div className="text-xs text-slate-500">
            {loading ? 'Loading...' : (manuscript && 'fetched_at' in manuscript ? 'Loaded from Google Docs' : '')}
          </div>
        </div>
        
        <div className="flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400">Loading manuscript...</div>
          ) : manuscript && 'error' in manuscript && manuscript.error === 'not_gdocs' ? (
            <div className="p-8 text-slate-500 text-center mt-20">
              Manuscript preview is only available for Google Docs sources.
            </div>
          ) : manuscript && 'available' in manuscript && !manuscript.available ? (
            <div className="p-8 text-slate-500 text-center mt-20">
              Manuscript preview unavailable. The findings below are still valid.
            </div>
          ) : (
            <div className="bg-white p-8 shadow-sm border border-slate-200 min-h-full whitespace-pre-wrap leading-relaxed text-slate-800">
              {highlightedNodes.length > 0 ? (
                highlightedNodes.map((node, index) => {
                   if (node.type === 'text') {
                     return <span key={index}>{node.content}</span>;
                   } else {
                     return (
                       <mark
                         key={index}
                         className={`px-1 rounded ${getSeverityColors(node.severity!)}`}
                         onClick={() => scrollToCard(node.targetId!)}
                         title="Click to view issue details"
                       >
                         {node.content}
                       </mark>
                     );
                   }
                })
              ) : (
                <span className="text-slate-400 italic text-sm">
                  Manuscript text loaded. No flagged passages to highlight.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Original layout */}
      <div className="w-1/2 h-full overflow-y-auto p-6 space-y-6 relative animate-fade-in text-left" ref={rightPaneRef}>
        
        {/* Key Strengths */}
        {strengths.length > 0 && (
          <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
            <h3 className="font-bold text-emerald-900 flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> Key Strengths
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-emerald-800 text-sm">
               {strengths.map(s => <li key={`${s.role_a}-${s.role_b}`}>{s.note}</li>)}
            </ul>
          </div>
        )}
      {/* Action Footer Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-4 border-b border-slate-200 justify-end print:hidden">
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
      <div className="flex border-b border-slate-200 print:hidden">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
        {shouldShow('overview') && (
          <div className="space-y-6">
            <h2 className="hidden print:block font-serif font-bold text-lg text-slate-900 mb-3">Overview</h2>
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
                        <span key={idx} className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-1 rounded-lg">âš ï¸ {sec}</span>
                      ))}
                    </div>
                  </div>
                )}
                {stubSections.length > 0 && (
                  <div className="mt-4 bg-amber-50/30 border border-amber-200 rounded-xl p-4">
                    <span className="text-xs font-bold text-amber-800 uppercase block mb-2">Thin Sections (under 40 words):</span>
                    <div className="flex flex-wrap gap-2">
                      {stubSections.map((sec, idx) => (
                        <span key={idx} className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-lg">âœŽ {formatRoleLabel(sec)}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>


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
        {shouldShow('inconsistencies') && (
          <div className="space-y-6">
            <h2 className="hidden print:block font-serif font-bold text-lg text-slate-900 mt-8 mb-3 border-t border-slate-300 pt-6">Inconsistencies</h2>
            {(() => {
              const grouped = inconsistenciesList.reduce((acc: Record<string, any[]>, inc: any) => {
                const groupKey = inc.section_a || inc.sectionA || 'General';
                if (!acc[groupKey]) acc[groupKey] = [];
                acc[groupKey].push(inc);
                return acc;
              }, {});

              let globalIdx = 0;
              return Object.entries(grouped).map(([sectionName, issues]) => (
                <div key={sectionName} className="mb-4">
                  <h3 className="font-serif font-bold text-slate-800 text-base mb-2.5 pb-1 border-b border-slate-200 flex items-center justify-between">
                    <span>{sectionName} <span className="text-slate-450 font-normal text-sm ml-1">({issues.length} {issues.length === 1 ? 'issue' : 'issues'})</span></span>
                  </h3>
                  <div className="space-y-3">
                    {issues.map((inc) => {
                      const idx = globalIdx++;
                      const isExpanded = isPrinting || expandedInconsistencies[idx];
                      const secB = inc.section_b || inc.sectionB || `Section B`;
                      const whatText = inc.explanation_what || inc.description || "Inconsistency found.";
                      const whyText = inc.explanation_why || "Logical disconnect.";
                      const fixText = inc.suggested_fix || inc.howToFix || "Harmonize text.";

                      return (
                        <div key={idx} data-issue-id={inc.inconsistency_id || inc.section_a || String(idx)} className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden break-inside-avoid-page">
                          <div className="flex w-full">
                            <button onClick={() => scrollToHighlight(inc.inconsistency_id || inc.section_a || String(idx))} className="bg-slate-100 hover:bg-indigo-100 px-3 py-3 border-r border-slate-200 text-indigo-600 cursor-pointer print:hidden" title="View in manuscript">
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                            <button onClick={() => toggleInconsistency(idx)} className="flex-1 px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer">
                            <div className="flex items-center gap-3">
                              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0">Flag {idx + 1}</span>
                              <span className="text-sm font-bold text-slate-800 line-clamp-1">Conflicts with {secB}</span>
                              <span className="hidden sm:inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0">
                                âœ¦ AI analysis
                              </span>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 print:hidden shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 print:hidden shrink-0" />}
                          </button>
                          </div>

                          {isExpanded && (
                            <div className="p-4 border-t border-slate-200 space-y-3 text-sm leading-relaxed text-slate-700">
                              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-150">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ðŸ” What Was Found:</span>
                                <p className="text-[13px]">{whatText}</p>
                              </div>
                              <div className="bg-amber-50/40 rounded-lg p-2.5 border border-amber-200/60 text-amber-900">
                                <span className="text-[10px] font-bold text-amber-700 uppercase block mb-1">ðŸ’¡ Why It Matters:</span>
                                <p className="text-[13px]">{whyText}</p>
                              </div>
                              <div className="border-l-4 border-indigo-500 pl-3 py-1.5 text-indigo-950">
                                <span className="text-[10px] font-bold text-indigo-700 uppercase block mb-1">ðŸ› ï¸ Suggested Fix:</span>
                                <p className="font-medium text-sm">{fixText}</p>
                              </div>
                              {/* Evidence Citation Block */}
                              {(inc.evidence_a || inc.evidence_b) && (
                                <div className="bg-indigo-50/30 rounded-lg p-2.5 border border-indigo-100 mt-1">
                                  <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-2 flex items-center gap-2">
                                    ðŸ“Ž Grounding Evidence:
                                    {inc.evidence_verified === false && (
                                      <span className="text-[9px] font-bold normal-case bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded" title="This quote could not be re-verified against the source section text.">
                                        unverified
                                      </span>
                                    )}
                                  </span>
                                  {inc.evidence_a && (
                                    <p className="italic text-slate-600 text-xs border-l-2 border-indigo-300 pl-2.5 mb-2">
                                      <span className="font-bold not-italic text-indigo-500">Source: </span>&ldquo;{inc.evidence_a}&rdquo;
                                    </p>
                                  )}
                                  {inc.evidence_b && (
                                    <p className="italic text-slate-600 text-xs border-l-2 border-rose-300 pl-2.5">
                                      <span className="font-bold not-italic text-rose-500">Conflict: </span>&ldquo;{inc.evidence_b}&rdquo;
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Unaddressed Objectives Block */}
                              {inc.objectives_unaddressed && inc.objectives_unaddressed.length > 0 && (
                                <div className="bg-amber-50/40 rounded-lg p-2.5 border border-amber-200/60">
                                  <span className="text-[10px] font-bold text-amber-700 uppercase block mb-1">âš ï¸ Unaddressed Objectives:</span>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {inc.objectives_unaddressed.map((obj: string, i: number) => (
                                      <li key={i} className="text-xs text-amber-900 italic">{obj}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Feedback Buttons */}
                              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-2 print:hidden">
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
                                        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
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
                                >ðŸ‘</button>
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
                                        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
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
                                >ðŸ‘Ž</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
            {inconsistenciesList.length === 0 && <p className="text-slate-500 text-sm">No inconsistencies detected.</p>}
          </div>
        )}

        {/* TAB 3: COHERENCE PAIRS (strong + weak + checked-and-cleared) */}
        {shouldShow('strong_coherence') && (
          <div className="space-y-6">
            <h2 className="hidden print:block font-serif font-bold text-lg text-slate-900 mt-8 mb-3 border-t border-slate-300 pt-6">Coherence Pairs</h2>

            {weakPairs.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Needs Attention</span>
                {weakPairs.map((item, idx) => (
                  <div key={idx} className="border rounded-xl p-5 shadow-xs flex flex-col gap-2 bg-rose-50/30 border-rose-200 break-inside-avoid-page">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      <span className="text-sm font-bold text-rose-900">{formatRoleLabel(item.role_a)} â†” {formatRoleLabel(item.role_b)}</span>
                      <span className="ml-auto text-xs font-bold px-2 py-1 rounded bg-rose-100 text-rose-800">Score: {item.score ?? 'N/A'}</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-7">weight {item.weight.toFixed(2)}{item.raw_similarity != null ? ` Â· raw similarity ${Math.round(item.raw_similarity * 100)}%` : ''}</p>
                    {item.verification?.note && (
                      <p className="text-sm leading-relaxed ml-7 text-rose-700">{item.verification.note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {strongPairs.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Strong</span>
                {strongPairs.map((item, idx) => {
                  const isSuperficial = item.verification?.alignment === 'superficial';
                  return (
                    <div
                      key={idx}
                      className={`border rounded-xl p-5 shadow-xs flex flex-col gap-2 break-inside-avoid-page ${isSuperficial ? 'bg-amber-50/30 border-amber-200' : 'bg-emerald-50/30 border-emerald-200'
                        }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <CheckCircle className={`w-5 h-5 ${isSuperficial ? 'text-amber-600' : 'text-emerald-600'}`} />
                        <span className={`text-sm font-bold ${isSuperficial ? 'text-amber-900' : 'text-emerald-900'}`}>{formatRoleLabel(item.role_a)} â†” {formatRoleLabel(item.role_b)}</span>
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
              </div>
            )}

            {allPairs.length === 0 && <p className="text-slate-500 text-sm">No coherence pairs reported.</p>}

            {dismissedPairs.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Checked and Cleared</span>
                <p className="text-xs text-slate-450">These pairs scored low but the model reviewed them individually and found no material inconsistency.</p>
                {dismissedPairs.map((d, idx) => (
                  <div key={idx} className="border rounded-xl p-4 shadow-xs bg-slate-50 border-slate-200 break-inside-avoid-page">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ShieldCheck className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-bold text-slate-700">{formatRoleLabel(d.role_a)} â†” {formatRoleLabel(d.role_b)}</span>
                      <span className="ml-auto text-xs font-bold px-2 py-1 rounded bg-slate-200 text-slate-700">Score: {d.score}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 ml-6">{d.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CITATIONS (Accordions) */}
        {shouldShow('citations') && (
          <div className="space-y-4">
            <h2 className="hidden print:block font-serif font-bold text-lg text-slate-900 mt-8 mb-3 border-t border-slate-300 pt-6">Citations</h2>
            {citationsList.map((cit, idx) => {
              const isExpanded = isPrinting || expandedCitations[idx];
              const rawText = cit.citation_raw_reference_text || cit.citation || "Reference entry";
              const badge = getCitationStatusBadge(cit);

              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden break-inside-avoid-page">
                  <button onClick={() => toggleCitation(idx)} className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer">
                    <div className="flex items-start gap-3 w-4/5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-0.5 shrink-0 ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-sm font-bold text-slate-800 truncate">{rawText}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400 print:hidden" /> : <ChevronDown className="w-5 h-5 text-slate-400 print:hidden" />}
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
                        <p className="text-xs text-slate-500 font-sans">âš ï¸ This reference was not found cited anywhere in the manuscript body.</p>
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

        {/* TAB 5: WRITING STYLE (advisory only, excluded from the score) */}
        {showOriginalityTab && shouldShow('originality') && aiText && (
          <div className="space-y-4">
            <h2 className="hidden print:block font-serif font-bold text-lg text-slate-900 mt-8 mb-3 border-t border-slate-300 pt-6">Writing Style Advisory</h2>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p>{aiText.disclaimer || DEFAULT_AI_TEXT_DISCLAIMER}</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">Writing Style Reading</span>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-indigo-400" style={{ width: `${Math.max(4, aiText.overall_score ?? 0)}%` }} />
                </div>
                <span className="text-sm font-extrabold text-slate-800 font-mono w-10 text-right">{Math.round(aiText.overall_score ?? 0)}</span>
              </div>
              <p className="text-xs text-slate-450">Well-written human academic prose commonly scores 40-60 on this scale â€” this is a style observation, not a verdict, and plays no part in the coherence score above.</p>
            </div>

            {aiText.section_scores && Object.keys(aiText.section_scores).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">By Section</span>
                {Object.entries(aiText.section_scores).map(([sec, val]) => (
                  <div key={sec} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium">{formatRoleLabel(sec)}</span>
                    <span className="font-mono font-bold text-slate-800">{val == null ? 'N/A' : Math.round(val)}</span>
                  </div>
                ))}
              </div>
            )}

            {aiText.flagged_sections && aiText.flagged_sections.length > 0 && (
              <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-4">
                <span className="text-xs font-bold text-amber-700 uppercase block mb-2">Sections with unusually uniform phrasing</span>
                <div className="flex flex-wrap gap-2">
                  {aiText.flagged_sections.map((sec, i) => (
                    <span key={i} className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-lg">{formatRoleLabel(sec)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
    </div>
  );
}

