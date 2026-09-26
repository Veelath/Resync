import React, { useState, useEffect } from 'react';
import { ScanResult, CitedReference, Inconsistency } from '../types.js';
import { API_BASE_URL, fetchManuscript } from '../services/api.js';
import {
  Download, Printer, ChevronDown, ChevronUp, CheckCircle, ListTree, ShieldCheck, Gauge, Link2, ExternalLink, AlertTriangle, Info, ArrowLeft, Plus, MousePointer, Sparkles, FileText, Check, X, AlertCircle, ThumbsUp, ThumbsDown
} from 'lucide-react';
import ScoreRing from './ScoreRing.tsx';
import { getScoreTier, downloadReport, computeRevisionPlan, formatRoleLabel, PAR_SCORE } from '../utils.js';
import logoPng from '../assets/logo.png';

interface ResultDetailsProps {
  scan: ScanResult;
  onBack?: () => void;
  onNewScan?: () => void;
}

function getCitationStatusBadge(cit: CitedReference): { label: string; className: string; detail: string; isLive: boolean } {
  switch (cit.citation_status) {
    case 'verified_metadata':
      return { label: '✓ Live', className: 'bg-emerald-100 text-emerald-800', detail: 'Confirmed against Crossref metadata — the DOI resolves to this exact work.', isLive: true };
    case 'accessible':
      return { label: '✓ Live', className: 'bg-emerald-100 text-emerald-800', detail: 'The link responded successfully.', isLive: true };
    case 'metadata_mismatch':
      return { label: '⚠ Mismatch', className: 'bg-amber-100 text-amber-800', detail: 'The DOI resolves, but its title/year does not match this reference.', isLive: false };
    case 'bot_wall':
      return { label: '⚠ Restricted', className: 'bg-amber-100 text-amber-800', detail: 'The publisher blocked automated verification.', isLive: false };
    case 'broken':
      return { label: '✕ Dead link', className: 'bg-rose-100 text-rose-800', detail: 'Unreachable or broken reference link.', isLive: false };
    case 'no_link':
      return { label: 'No Link', className: 'bg-slate-100 text-slate-600', detail: 'This reference has no URL or DOI to verify.', isLive: false };
    case 'unknown_error':
      return { label: '? Unverified', className: 'bg-slate-100 text-slate-600', detail: 'Verification failed for a transient reason.', isLive: false };
    default: {
      const isAccessible = cit.citation_is_accessible !== undefined ? cit.citation_is_accessible : (cit.status === 'Accessible');
      return isAccessible
        ? { label: '✓ Live', className: 'bg-emerald-100 text-emerald-800', detail: 'Verified accessible reference.', isLive: true }
        : { label: '✕ Dead link', className: 'bg-rose-100 text-rose-800', detail: 'Unreachable or broken reference link.', isLive: false };
    }
  }
}

const DEFAULT_AI_TEXT_DISCLAIMER =
  'Advisory only, not an academic-integrity determination. This is a stylometric heuristic over surface features and cannot verify authorship. Well-written human academic prose commonly scores 40-60 on this scale; this indicator must never be used to block a submission or as an integrity charge on its own.';

export default function ResultDetails({ scan, onBack, onNewScan }: ResultDetailsProps) {
  const [viewMode, setViewMode] = useState<'manuscript' | 'tabs'>('manuscript');
  const [activeTab, setActiveTab] = useState<'overview' | 'inconsistencies' | 'strong_coherence' | 'citations' | 'originality'>('overview');
  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'contradiction' | 'logic_gap' | 'redundancy'>('all');

  const [manuscriptText, setManuscriptText] = useState<string | null>(null);
  const [manuscriptLoading, setManuscriptLoading] = useState(false);
  const [manuscriptError, setManuscriptError] = useState<string | null>(null);

  useEffect(() => {
    if (scan.analysis_run_id && manuscriptText === null && !manuscriptError) {
      setManuscriptLoading(true);
      setManuscriptError(null);
      fetchManuscript(scan.analysis_run_id)
        .then(res => {
          if (res.available && res.text) {
            setManuscriptText(res.text);
          } else if (res.reason === 'private') {
            setManuscriptError("Document is no longer accessible");
          } else if (res.reason === 'non_gdocs') {
            setManuscriptError("Preview is only available for Google Docs");
          } else {
            setManuscriptError("Manuscript preview unavailable");
          }
        })
        .catch((e) => {
          console.error('fetchManuscript failed:', e);
          setManuscriptError("Manuscript preview unavailable");
        })
        .finally(() => setManuscriptLoading(false));
    }
  }, [scan.analysis_run_id, manuscriptText, manuscriptError]);

  // Accordion state maps for detailed tabs
  const [expandedInconsistencies, setExpandedInconsistencies] = useState<Record<number, boolean>>({});
  const [expandedCitations, setExpandedCitations] = useState<Record<number, boolean>>({});
  const [feedbackMap, setFeedbackMap] = useState<Record<number, 'up' | 'down' | null>>({});

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

  const handleDownloadReport = () => downloadReport(scan);
  const handlePrint = () => {
    setIsPrinting(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  };

  const displayScore = scan.coherenceScore;
  const tier = getScoreTier(scan.score_breakdown?.band);
  const breakdown = scan.score_breakdown;

  const inconsistenciesList: Inconsistency[] = (scan.inconsistencies && scan.inconsistencies.length > 0)
    ? scan.inconsistencies
    : (scan.correlationReport && scan.correlationReport.length > 0 ? scan.correlationReport : [
      {
        sectionA: 'Chapter 1 — Statement of the Problem',
        sectionB: 'Chapter 3 — Methodology',
        inconsistencyType: 'logic_gap',
        description: 'Biometric collection is promised in Objectives but absent from Methodology.',
        explanation_what: 'Biometric data collection was mentioned in Statement of the Problem ("measure student engagement using biometric data"), but Chapter 3 Methodology describes survey-based data collection using MBI-SS and AWS without any biometric protocol.',
        explanation_why: 'Stating a biometric collection method in the problem statement creates an unfulfilled methodological expectation if omitted in the methodology section.',
        howToFix: 'Incorporate the biometric telemetry protocol into Chapter 3 or adjust the stated scope in Chapter 1.',
        severity: 'High'
      },
      {
        sectionA: 'Chapter 1 — Introduction',
        sectionB: 'Chapter 3 — Methodology',
        inconsistencyType: 'contradiction',
        description: 'Scope contradiction regarding target geographic location.',
        explanation_what: 'Chapter 1 states the scope covers "both rural and urban settings" across Philippine universities, but Chapter 3 specifies sampling from "urban barangays in Metro Manila only".',
        explanation_why: 'Generalizing the title and introduction to all Philippine universities while restricting actual sampling to urban Metro Manila creates a geographic mismatch.',
        howToFix: 'Harmonize the target scope in Chapter 1 with the actual sampling frame in Chapter 3.',
        severity: 'High'
      },
      {
        sectionA: 'Chapter 2 — Review of Related Literature',
        sectionB: 'Chapter 2 — Conceptual Framework',
        inconsistencyType: 'redundancy',
        description: 'Repeated definition of Technology Acceptance framework.',
        explanation_what: 'The verbatim definition of Technology Acceptance ("the degree to which an individual believes that using a particular system would enhance their performance") is repeated twice in Chapter 2.',
        explanation_why: 'Redundant definitions inflate section length without adding conceptual clarity.',
        howToFix: 'Reference the initial definition in Chapter 2 instead of repeating the verbatim phrase in Conceptual Framework.',
        severity: 'Low'
      },
      {
        sectionA: 'Chapter 3 — Methodology',
        sectionB: 'Chapter 5 — Conclusions',
        inconsistencyType: 'logic_gap',
        description: 'Unaddressed research instrument in conclusions.',
        explanation_what: 'Chapter 3 lists MBI-SS and AWS as data collection instruments, but Chapter 5 conclusions omit metrics derived from AWS.',
        explanation_why: 'Conclusions must address all primary research instruments introduced in the methodology.',
        howToFix: 'Ensure AWS survey outcomes are addressed in the Chapter 5 conclusions synthesis.',
        severity: 'Medium'
      },
      {
        sectionA: 'Chapter 1 — Introduction',
        sectionB: 'Chapter 3 — Methodology',
        inconsistencyType: 'contradiction',
        description: 'Sample size discrepancy.',
        explanation_what: 'Chapter 1 Introduction implies a large-scale nationwide sample, but Chapter 3 limits the sample to exactly 120 respondents across four universities.',
        explanation_why: 'Conflicting sample size indicators create uncertainty around statistical power and generalizability.',
        howToFix: 'Align sample size description in Chapter 1 with the exact sample size in Chapter 3.',
        severity: 'High'
      }
    ]);

  // Counts by type
  const contradictionCount = inconsistenciesList.filter(i => (i.inconsistencyType || '').toLowerCase().includes('contradiction')).length;
  const logicGapCount = inconsistenciesList.filter(i => (i.inconsistencyType || '').toLowerCase().includes('logic')).length;
  const redundancyCount = inconsistenciesList.filter(i => (i.inconsistencyType || '').toLowerCase().includes('redundancy')).length;

  const citationsList: CitedReference[] = (scan.citations && scan.citations.length > 0)
    ? scan.citations
    : (scan.references && scan.references.length > 0 ? scan.references : [
      { citation: 'Bandura, A. (1997). Self-efficacy: The exercise of control.', citation_primary_link: 'https://doi.org/10.1007/rrq.121', citation_status: 'accessible', status: 'Accessible' },
      { citation: 'Cruz, M. et al. (2023). Digital transformation in Philippine HEIs.', citation_primary_link: 'https://journals.pup.edu.ph/index.php/ijra/article/view/1824', citation_status: 'broken', status: 'Broken Link' },
      { citation: 'Davis, F.D. (1989). Perceived Usefulness, Perceived Ease of Use.', citation_primary_link: 'https://doi.org/10.2307/249008', citation_status: 'accessible', status: 'Accessible' },
      { citation: 'Garcia, L. (2022). Capstone completion barriers in ASEAN universities.', citation_primary_link: 'https://researchgate.net/publication/390421089', citation_status: 'broken', status: 'Broken Link' },
      { citation: 'Reyes, J.A. (2024). Coherence in multi-author research manuscripts.', citation_primary_link: 'https://doi.org/10.1016/j.compedu.2024.104801', citation_status: 'accessible', status: 'Accessible' },
      { citation: 'Santos, K. & Lim, R. (2023). AI tools in thesis writing workflows.', citation_primary_link: 'https://philjol.info/index.php/JPAIR/article/view/7821', citation_status: 'accessible', status: 'Accessible' }
    ]);

  const deadCitationsCount = citationsList.filter(c => getCitationStatusBadge(c).label.includes('Dead') || c.status === 'Broken Link' || c.citation_status === 'broken').length;

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

  const stubSections = breakdown?.structural_detail?.stub_sections || [];
  const aiText = scan.ai_text_indicator;
  const showOriginalityTab = aiText?.overall_score != null;

  const tabs: Array<{ id: typeof activeTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'inconsistencies', label: `Inconsistencies (${inconsistenciesList.length})` },
    { id: 'strong_coherence', label: `Coherence Pairs (${allPairs.length})` },
    { id: 'citations', label: `Citations (${citationsList.length})` },
    ...(showOriginalityTab ? [{ id: 'originality' as const, label: 'Writing Style' }] : []),
  ];

  const filteredInconsistencies = inconsistenciesList.filter(inc => {
    if (activeFilter === 'all') return true;
    const type = (inc.inconsistencyType || '').toLowerCase();
    if (activeFilter === 'contradiction') return type.includes('contradiction');
    if (activeFilter === 'logic_gap') return type.includes('logic');
    if (activeFilter === 'redundancy') return type.includes('redundancy');
    return true;
  });

  const selectedIssue = selectedIssueIndex !== null ? inconsistenciesList[selectedIssueIndex] : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col w-full -m-6 sm:-m-8 p-0" id={`scan-report-${scan.id}`}>

      {/* 1. TOP HEADER BAR (Figma exact top navbar) */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-2xs print:hidden">
        {/* Left: Home link, Logo, Breadcrumb title */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={() => {
              if (onBack) onBack();
              else window.history.back();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
          >
            <span>&lt; Home</span>
          </button>

          <img src={logoPng} alt="Resync Logo" className="h-6 w-auto object-contain shrink-0" />

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate min-w-0">
            <span>/</span>
            <span className="text-slate-500 truncate max-w-xs sm:max-w-md md:max-w-lg">
              {scan.title || 'Predictors of Academic Burnout Among STEM Undergraduates'}
            </span>
          </div>
        </div>

        {/* Right: Export PDF & + New Scan buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* View mode toggle */}
          <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 mr-2">
            <button
              onClick={() => setViewMode('manuscript')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${viewMode === 'manuscript' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Figma View
            </button>
            <button
              onClick={() => setViewMode('tabs')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${viewMode === 'tabs' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Detailed Tabs
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => {
              if (onNewScan) onNewScan();
            }}
            className="bg-[#131bb4] hover:bg-[#0e148e] text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Scan</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN BODY (Figma exact 3-column layout vs Detailed Tabs) */}
      {viewMode === 'manuscript' ? (
        <div className="flex-grow flex flex-col md:flex-row w-full max-w-[1536px] mx-auto items-stretch">

          {/* ================= LEFT SIDEBAR (Width ~240px) ================= */}
          <aside className="w-full md:w-64 bg-white border-r border-slate-200/80 p-5 space-y-6 shrink-0 text-left print:hidden">

            {/* Score Ring Box */}
            <div className="flex flex-col items-center justify-center text-center pb-5 border-b border-slate-100">
              <ScoreRing score={displayScore} size={96} strokeWidth={8} showDetails={false} showSubtext={true} className="p-0 mb-2" />
              <h3 className="font-bold text-sm text-slate-800">{tier.label}</h3>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold mt-0.5">COHERENCE SCORE</span>

              {/* Breakdown counts with clickable filter toggles */}
              <div className="w-full space-y-1.5 mt-4 pt-3 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveFilter(activeFilter === 'contradiction' ? 'all' : 'contradiction')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${activeFilter === 'contradiction'
                      ? 'bg-rose-50 ring-1 ring-rose-300 font-bold'
                      : 'hover:bg-slate-50'
                    }`}
                  title="Filter Contradictions"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                    <span className={activeFilter === 'contradiction' ? 'text-rose-900 font-bold' : 'text-slate-600'}>Contradiction</span>
                  </div>
                  <span className="font-bold font-mono text-rose-600">{contradictionCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter(activeFilter === 'logic_gap' ? 'all' : 'logic_gap')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${activeFilter === 'logic_gap'
                      ? 'bg-purple-50 ring-1 ring-purple-300 font-bold'
                      : 'hover:bg-slate-50'
                    }`}
                  title="Filter Logic Gaps"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    <span className={activeFilter === 'logic_gap' ? 'text-purple-900 font-bold' : 'text-slate-600'}>Logic Gap</span>
                  </div>
                  <span className="font-bold font-mono text-purple-600">{logicGapCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter(activeFilter === 'redundancy' ? 'all' : 'redundancy')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${activeFilter === 'redundancy'
                      ? 'bg-amber-50 ring-1 ring-amber-300 font-bold'
                      : 'hover:bg-slate-50'
                    }`}
                  title="Filter Redundancies"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    <span className={activeFilter === 'redundancy' ? 'text-amber-900 font-bold' : 'text-slate-600'}>Redundancy</span>
                  </div>
                  <span className="font-bold font-mono text-amber-600">{redundancyCount}</span>
                </button>
              </div>
            </div>

            {/* ISSUES FOUND List (Grouped & Filterable) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                  {activeFilter === 'logic_gap' ? `LOGIC GAPS (${filteredInconsistencies.length})` : activeFilter === 'contradiction' ? `CONTRADICTIONS (${filteredInconsistencies.length})` : activeFilter === 'redundancy' ? `REDUNDANCIES (${filteredInconsistencies.length})` : `ISSUES FOUND (${inconsistenciesList.length})`}
                </span>
                {activeFilter !== 'all' && (
                  <button
                    onClick={() => setActiveFilter('all')}
                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Show all
                  </button>
                )}
              </div>

              {/* Category Filter Chips in Sidebar */}
              <div className="grid grid-cols-2 gap-1 pb-1">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${activeFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  All ({inconsistenciesList.length})
                </button>
                <button
                  onClick={() => setActiveFilter(activeFilter === 'logic_gap' ? 'all' : 'logic_gap')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${activeFilter === 'logic_gap'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                >
                  Logic ({logicGapCount})
                </button>
                <button
                  onClick={() => setActiveFilter(activeFilter === 'contradiction' ? 'all' : 'contradiction')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${activeFilter === 'contradiction'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                >
                  Contradict ({contradictionCount})
                </button>
                <button
                  onClick={() => setActiveFilter(activeFilter === 'redundancy' ? 'all' : 'redundancy')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${activeFilter === 'redundancy'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                >
                  Redundant ({redundancyCount})
                </button>
              </div>

              {/* Filtered / Grouped Issues List */}
              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {filteredInconsistencies.map((inc) => {
                  const originalIdx = inconsistenciesList.indexOf(inc);
                  const type = (inc.inconsistencyType || '').toLowerCase();
                  let dotColor = 'bg-rose-500';
                  let textColor = 'text-rose-600';
                  let labelText = 'CONTRADICTION';

                  if (type.includes('logic')) {
                    dotColor = 'bg-purple-500';
                    textColor = 'text-purple-600';
                    labelText = 'LOGIC GAP';
                  } else if (type.includes('redundancy')) {
                    dotColor = 'bg-amber-500';
                    textColor = 'text-amber-600';
                    labelText = 'REDUNDANCY';
                  }

                  const isSelected = selectedIssueIndex === originalIdx;

                  return (
                    <button
                      key={originalIdx}
                      onClick={() => {
                        setSelectedIssueIndex(isSelected ? null : originalIdx);
                        const targetId = originalIdx === 0 ? 'chapter-1' : (originalIdx === 1 ? 'chapter-1' : (originalIdx === 2 ? 'chapter-2' : (originalIdx === 3 ? 'chapter-5' : 'chapter-3')));
                        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-0.5 ${isSelected
                          ? 'bg-indigo-50/90 border-indigo-400 shadow-2xs ring-1 ring-indigo-300'
                          : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                          <span className={`${textColor} uppercase font-mono tracking-wider text-[10px]`}>{labelText}</span>
                        </div>
                        <span className="text-slate-400 font-mono text-[10px]">#{originalIdx + 1}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 truncate pl-3">
                        {inc.sectionA || inc.section_a || 'Section A'}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate pl-3">
                        {inc.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* HIGHLIGHT KEY */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                HIGHLIGHT KEY
              </span>
              <div className="space-y-1.5">
                <div className="bg-[#fff1f2] border border-[#fecdd3] text-[#e11d48] px-3 py-1.5 rounded-lg text-xs font-bold text-center">
                  Contradiction
                </div>
                <div className="bg-[#f5f3ff] border border-[#ddd6fe] text-[#7c3aed] px-3 py-1.5 rounded-lg text-xs font-bold text-center">
                  Logic Gap
                </div>
                <div className="bg-[#fffbeb] border border-[#fde68a] text-[#d97706] px-3 py-1.5 rounded-lg text-xs font-bold text-center">
                  Redundancy
                </div>
              </div>
            </div>

          </aside>

          {/* ================= MIDDLE MAIN MANUSCRIPT VIEW ================= */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 min-w-0 text-left overflow-y-auto">

            {/* Top Manuscript Report Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-3">
              <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-600 font-bold block">
                SAMPLE MANUSCRIPT REPORT
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {scan.title || 'Predictors of Academic Burnout Among STEM Undergraduates in Philippine Universities'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-sans">
                {scan.chapterType || 'A descriptive-correlational study · Academic Year 2023–2024'}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Scan complete
                </span>
                <span className="text-xs text-slate-400 font-sans">
                  {inconsistenciesList.length} issues detected across 8 sections &middot; Click any highlight to see AI explanation
                </span>
              </div>
            </div>

            {/* HIGHLIGHTS Filter Bar */}
            <div className="flex items-center gap-2 pt-1 pb-1 flex-wrap">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                HIGHLIGHTS:
              </span>
              <button
                onClick={() => setActiveFilter(activeFilter === 'contradiction' ? 'all' : 'contradiction')}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${activeFilter === 'contradiction'
                    ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                    : 'bg-[#fff1f2] text-[#e11d48] border-[#fecdd3] hover:bg-rose-100'
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Contradiction ({contradictionCount})</span>
              </button>

              <button
                onClick={() => setActiveFilter(activeFilter === 'logic_gap' ? 'all' : 'logic_gap')}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${activeFilter === 'logic_gap'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                    : 'bg-[#f5f3ff] text-[#7c3aed] border-[#ddd6fe] hover:bg-purple-100'
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Logic Gap ({logicGapCount})</span>
              </button>

              <button
                onClick={() => setActiveFilter(activeFilter === 'redundancy' ? 'all' : 'redundancy')}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${activeFilter === 'redundancy'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                    : 'bg-[#fffbeb] text-[#d97706] border-[#fde68a] hover:bg-amber-100'
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Redundancy ({redundancyCount})</span>
              </button>

              {activeFilter !== 'all' && (
                <button
                  onClick={() => setActiveFilter('all')}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Clear filter &times;
                </button>
              )}
            </div>

            {/* GROUPED FINDINGS PANEL (Triggered when user clicks Logic Gap or another category) */}
            {activeFilter !== 'all' && (
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all animate-fade-in text-left ${activeFilter === 'logic_gap'
                  ? 'bg-[#f5f3ff] border-purple-200 shadow-2xs'
                  : activeFilter === 'contradiction'
                    ? 'bg-[#fff1f2] border-rose-200 shadow-2xs'
                    : 'bg-[#fffbeb] border-amber-200 shadow-2xs'
                }`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${activeFilter === 'logic_gap' ? 'bg-purple-600' : activeFilter === 'contradiction' ? 'bg-rose-600' : 'bg-amber-600'
                      } animate-pulse`} />
                    <h3 className="font-bold text-sm text-slate-900">
                      Showing all {filteredInconsistencies.length} {activeFilter === 'logic_gap' ? 'Logic Gaps' : activeFilter === 'contradiction' ? 'Contradictions' : 'Redundancies'} found in this manuscript
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveFilter('all')}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer shrink-0"
                  >
                    Show all issues ({inconsistenciesList.length})
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredInconsistencies.map((inc, i) => {
                    const originalIdx = inconsistenciesList.indexOf(inc);
                    const isSelected = selectedIssueIndex === originalIdx;
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          setSelectedIssueIndex(originalIdx);
                          const targetId = originalIdx === 0 ? 'chapter-1' : (originalIdx === 1 ? 'chapter-1' : (originalIdx === 2 ? 'chapter-2' : (originalIdx === 3 ? 'chapter-5' : 'chapter-3')));
                          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left space-y-1.5 ${isSelected
                            ? 'bg-white border-indigo-400 shadow-md ring-2 ring-indigo-300'
                            : 'bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-2xs'
                          }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className={`font-mono uppercase tracking-wider ${activeFilter === 'logic_gap' ? 'text-purple-700' : activeFilter === 'contradiction' ? 'text-rose-700' : 'text-amber-700'
                            }`}>
                            OCCURRENCE #{i + 1}
                          </span>
                          <span className="text-slate-400 font-mono text-[10px]">#{originalIdx + 1}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                          {inc.sectionA || inc.section_a} ↔ {inc.sectionB || inc.section_b}
                        </h4>
                        <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                          {inc.description}
                        </p>
                        <div className="pt-1 flex items-center justify-between text-[10px] text-indigo-600 font-bold">
                          <span>Severity: {inc.severity || 'High'}</span>
                          <span className="flex items-center gap-1 hover:underline">
                            <span>Jump to passage</span>
                            <span>→</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MANUSCRIPT CONTENT CARD */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-10 shadow-2xs space-y-8 font-sans leading-relaxed text-slate-800">

              {!scan.analysis_run_id ? (
                <>
                  {/* CHAPTER 1 */}
              <section id="chapter-1" className={`space-y-4 border-b border-slate-100 pb-8 transition-opacity duration-300 ${activeFilter !== 'all' && activeFilter !== 'logic_gap' && activeFilter !== 'contradiction' ? 'opacity-35' : 'opacity-100'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-600 font-bold block">
                      CHAPTER 1
                    </span>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                      Introduction
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${activeFilter === 'contradiction'
                        ? 'bg-rose-500 text-white shadow-2xs animate-pulse'
                        : activeFilter === 'logic_gap'
                          ? 'bg-slate-100 text-slate-400 opacity-60'
                          : 'bg-[#fff1f2] text-[#e11d48] border border-[#fecdd3]'
                      }`}>
                      Contradiction
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${activeFilter === 'logic_gap'
                        ? 'bg-purple-600 text-white shadow-2xs animate-pulse'
                        : activeFilter === 'contradiction'
                          ? 'bg-slate-100 text-slate-400 opacity-60'
                          : 'bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe]'
                      }`}>
                      Logic Gap
                    </span>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                  Academic burnout has emerged as a significant psychological concern among university students worldwide, with particular severity observed in science, technology, engineering, and mathematics (STEM) programs. This study investigates the predictors of academic burnout among{' '}
                  <mark
                    onClick={() => setSelectedIssueIndex(1)}
                    className={`font-semibold px-1 rounded cursor-pointer transition-all ${activeFilter === 'logic_gap'
                        ? 'bg-slate-100 text-slate-400 opacity-50'
                        : activeFilter === 'contradiction' || selectedIssueIndex === 1
                          ? 'bg-rose-200 text-[#e11d48] ring-2 ring-rose-400 font-bold'
                          : 'bg-[#fff1f2] text-[#e11d48] border-b-2 border-[#fecdd3] hover:bg-rose-100'
                      }`}
                  >
                    STEM undergraduates across Philippine universities, covering both rural and urban settings.
                  </mark>
                  {' '}The increasing competitive pressure, rigorous coursework, and limited psychosocial support structures in Philippine higher education create conditions that are especially conducive to burnout progression.
                </p>

                {/* Sub-heading: Objectives of the Study */}
                <div className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-base text-slate-900">
                      Objectives of the Study
                    </h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${activeFilter === 'contradiction'
                        ? 'bg-rose-500 text-white shadow-2xs animate-pulse'
                        : activeFilter === 'logic_gap'
                          ? 'bg-slate-100 text-slate-400 opacity-60'
                          : 'bg-[#fff1f2] text-[#e11d48] border border-[#fecdd3]'
                      }`}>
                      Contradiction
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    This study specifically aims to: (1) identify the prevalence of academic burnout among STEM students; (2) determine burnout predictors among students in{' '}
                    <mark
                      onClick={() => setSelectedIssueIndex(1)}
                      className={`font-semibold px-1 rounded cursor-pointer transition-all ${activeFilter === 'logic_gap'
                          ? 'bg-slate-100 text-slate-400 opacity-50'
                          : activeFilter === 'contradiction' || selectedIssueIndex === 1
                            ? 'bg-rose-200 text-[#e11d48] ring-2 ring-rose-400 font-bold'
                            : 'bg-[#fff1f2] text-[#e11d48] border-b-2 border-[#fecdd3] hover:bg-rose-100'
                        }`}
                    >
                      urban barangays in Metro Manila only;
                    </mark>
                    {' '}and (3) assess the moderating role of peer support on burnout levels among the identified population.
                  </p>
                </div>

                {/* Sub-heading: Statement of the Problem */}
                <div className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-base text-slate-900">
                      Statement of the Problem
                    </h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${activeFilter === 'logic_gap'
                        ? 'bg-purple-600 text-white shadow-2xs animate-pulse'
                        : activeFilter === 'contradiction'
                          ? 'bg-slate-100 text-slate-400 opacity-60'
                          : 'bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe]'
                      }`}>
                      Logic Gap
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Despite growing awareness of mental health issues in tertiary education, few empirical studies have examined the specific predictors of burnout within Philippine STEM contexts. The study will{' '}
                    <mark
                      onClick={() => setSelectedIssueIndex(0)}
                      className={`font-semibold px-1 rounded cursor-pointer transition-all ${activeFilter === 'contradiction' || activeFilter === 'redundancy'
                          ? 'bg-slate-100 text-slate-400 opacity-50'
                          : activeFilter === 'logic_gap' || selectedIssueIndex === 0
                            ? 'bg-purple-200 text-[#7c3aed] ring-2 ring-purple-500 font-bold shadow-xs'
                            : 'bg-[#f5f3ff] text-[#7c3aed] border-b-2 border-[#ddd6fe] hover:bg-purple-100'
                        }`}
                    >
                      measure student engagement using biometric data
                    </mark>
                    {' '}collected over one semester to answer three research questions: (1) What is the current burnout level among STEM undergraduates? (2) Which academic and environmental factors best predict burnout? (3) Does peer support moderate the relationship between workload and burnout?
                  </p>
                </div>
              </section>

              {/* CHAPTER 2 */}
              <section id="chapter-2" className={`space-y-4 border-b border-slate-100 pb-8 transition-opacity duration-300 ${activeFilter !== 'all' && activeFilter !== 'redundancy' ? 'opacity-35' : 'opacity-100'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-600 font-bold block">
                      CHAPTER 2
                    </span>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                      Review of Related Literature
                    </h2>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${activeFilter === 'redundancy'
                      ? 'bg-amber-500 text-white shadow-2xs animate-pulse'
                      : activeFilter !== 'all'
                        ? 'bg-slate-100 text-slate-400 opacity-60'
                        : 'bg-[#fffbeb] text-[#d97706] border border-[#fde68a]'
                    }`}>
                    Redundancy
                  </span>
                </div>

                <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                  <mark
                    onClick={() => setSelectedIssueIndex(2)}
                    className={`font-semibold px-1 rounded cursor-pointer transition-all ${activeFilter === 'logic_gap' || activeFilter === 'contradiction'
                        ? 'bg-slate-100 text-slate-400 opacity-50'
                        : activeFilter === 'redundancy' || selectedIssueIndex === 2
                          ? 'bg-amber-200 text-[#d97706] ring-2 ring-amber-400 font-bold'
                          : 'bg-[#fffbeb] text-[#d97706] border-b-2 border-[#fde68a] hover:bg-amber-100'
                      }`}
                  >
                    Technology acceptance, defined as the degree to which an individual believes that using a particular system would enhance their performance,
                  </mark>
                  {' '}is central to understanding digital tool adoption in education. Several frameworks build on this foundational concept, establishing baseline metrics for technological adaptation.
                </p>

                {/* Sub-heading: Conceptual Framework */}
                <div className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-base text-slate-900">
                      Conceptual Framework
                    </h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${activeFilter === 'redundancy'
                        ? 'bg-amber-500 text-white shadow-2xs animate-pulse'
                        : activeFilter !== 'all'
                          ? 'bg-slate-100 text-slate-400 opacity-60'
                          : 'bg-[#fffbeb] text-[#d97706] border border-[#fde68a]'
                      }`}>
                      Redundancy
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    <mark
                      onClick={() => setSelectedIssueIndex(2)}
                      className={`font-semibold px-1 rounded cursor-pointer transition-all ${activeFilter === 'logic_gap' || activeFilter === 'contradiction'
                          ? 'bg-slate-100 text-slate-400 opacity-50'
                          : activeFilter === 'redundancy' || selectedIssueIndex === 2
                            ? 'bg-amber-200 text-[#d97706] ring-2 ring-amber-400 font-bold'
                            : 'bg-[#fffbeb] text-[#d97706] border-b-2 border-[#fde68a] hover:bg-amber-100'
                        }`}
                    >
                      Technology acceptance, defined as the degree to which an individual believes that using a particular system would enhance their performance,
                    </mark>
                    {' '}serves as the theoretical anchor for this study's digital-tool adoption model. Building on this definition, the framework positions perceived usefulness and perceived ease of use as mediating variables between environmental stressors and burnout outcomes.
                  </p>
                </div>
              </section>

              {/* CHAPTER 3 */}
              <section id="chapter-3" className={`space-y-4 border-b border-slate-100 pb-8 transition-opacity duration-300 ${activeFilter !== 'all' && activeFilter !== 'logic_gap' && activeFilter !== 'contradiction' ? 'opacity-35' : 'opacity-100'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-600 font-bold block">
                      CHAPTER 3
                    </span>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                      Methodology
                    </h2>
                  </div>
                  <div className="flex gap-1.5">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${activeFilter === 'logic_gap'
                        ? 'bg-purple-600 text-white shadow-2xs animate-pulse'
                        : activeFilter === 'contradiction'
                          ? 'bg-slate-100 text-slate-400 opacity-60'
                          : 'bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe]'
                      }`}>
                      Logic Gap
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${activeFilter === 'contradiction'
                        ? 'bg-rose-500 text-white shadow-2xs animate-pulse'
                        : activeFilter === 'logic_gap'
                          ? 'bg-slate-100 text-slate-400 opacity-60'
                          : 'bg-[#fff1f2] text-[#e11d48] border border-[#fecdd3]'
                      }`}>
                      Contradiction
                    </span>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                  A descriptive-correlational research design was employed to examine the relationship between academic workload, peer support, and burnout among university students. Data were collected using the{' '}
                  <mark
                    onClick={() => setSelectedIssueIndex(0)}
                    className={`font-semibold px-1 rounded cursor-pointer transition-all ${activeFilter === 'contradiction' || activeFilter === 'redundancy'
                        ? 'bg-slate-100 text-slate-400 opacity-50'
                        : activeFilter === 'logic_gap' || selectedIssueIndex === 0
                          ? 'bg-purple-200 text-[#7c3aed] ring-2 ring-purple-500 font-bold shadow-xs'
                          : 'bg-[#f5f3ff] text-[#7c3aed] border-b-2 border-[#ddd6fe] hover:bg-purple-100'
                      }`}
                  >
                    Maslach Burnout Inventory–Student Survey (MBI-SS) and the Academic Workload Scale (AWS).
                  </mark>
                  {' '}The research instruments were administered via an online survey platform during the second semester of Academic Year 2023–2024. A total of{' '}
                  <mark
                    onClick={() => setSelectedIssueIndex(4)}
                    className={`font-semibold px-1 rounded cursor-pointer transition-all ${activeFilter === 'logic_gap'
                        ? 'bg-slate-100 text-slate-400 opacity-50'
                        : activeFilter === 'contradiction' || selectedIssueIndex === 4
                          ? 'bg-rose-200 text-[#e11d48] ring-2 ring-rose-400 font-bold'
                          : 'bg-[#fff1f2] text-[#e11d48] border-b-2 border-[#fecdd3] hover:bg-rose-100'
                      }`}
                  >
                    120 respondents
                  </mark>
                  {' '}were recruited through stratified random sampling across four Metro Manila universities, with quotas set per year level and degree program.
                </p>
              </section>

              {/* CHAPTER 4 */}
              <section id="chapter-4" className={`space-y-4 border-b border-slate-100 pb-8 transition-opacity duration-300 ${activeFilter !== 'all' ? 'opacity-35' : 'opacity-100'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-600 font-bold block">
                      CHAPTER 4
                    </span>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                      Results and Discussion
                    </h2>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      Statistical Synthesis
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 italic">
                  Survey metrics and regression model findings evaluated against stated hypotheses.
                </p>
              </section>

              {/* CHAPTER 5 */}
              <section id="chapter-5" className={`space-y-4 border-b border-slate-100 pb-8 transition-opacity duration-300 ${activeFilter !== 'all' && activeFilter !== 'logic_gap' ? 'opacity-35' : 'opacity-100'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-600 font-bold block">
                      CHAPTER 5
                    </span>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                      Conclusions and Recommendations
                    </h2>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${activeFilter === 'logic_gap'
                      ? 'bg-purple-600 text-white shadow-2xs animate-pulse'
                      : activeFilter !== 'all'
                        ? 'bg-slate-100 text-slate-400 opacity-60'
                        : 'bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe]'
                    }`}>
                    Logic Gap
                  </span>
                </div>

                <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                  Based on the statistical findings, academic workload demonstrates a significant correlation with emotional exhaustion and depersonalization among Philippine STEM undergraduates. However,{' '}
                  <mark
                    onClick={() => setSelectedIssueIndex(3)}
                    className={`font-semibold px-1 rounded cursor-pointer transition-all ${activeFilter === 'contradiction' || activeFilter === 'redundancy'
                        ? 'bg-slate-100 text-slate-400 opacity-50'
                        : activeFilter === 'logic_gap' || selectedIssueIndex === 3
                          ? 'bg-purple-200 text-[#7c3aed] ring-2 ring-purple-500 font-bold shadow-xs'
                          : 'bg-[#f5f3ff] text-[#7c3aed] border-b-2 border-[#ddd6fe] hover:bg-purple-100'
                      }`}
                  >
                    the chapter conclusions address only the MBI-SS burnout indices without reporting on the Academic Workload Scale (AWS)
                  </mark>
                  {' '}data collection protocol defined in Chapter 3 Methodology, leaving a primary research instrument unaddressed in the final thesis conclusions.
                </p>
              </section>

                </>
              ) : manuscriptLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-sm font-bold">Loading manuscript text...</p>
                </div>
              ) : manuscriptError ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
                  <AlertTriangle className="w-10 h-10 text-slate-300" />
                  <p className="text-base font-bold">{manuscriptError}</p>
                </div>
              ) : manuscriptText ? (
                <div className="whitespace-pre-wrap text-sm sm:text-base text-slate-700">
                  {manuscriptText}
                </div>
              ) : null}

              {/* BIBLIOGRAPHY / REFERENCES */}
              <section className="space-y-4 pt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                      REFERENCES
                    </span>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                      Bibliography
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
                      {citationsList.length} sources checked
                    </span>
                    <span className="bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full">
                      {deadCitationsCount} inaccessible
                    </span>
                  </div>
                </div>

                {/* Dead URL Warning Box */}
                {deadCitationsCount > 0 && (
                  <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-xl p-4 flex items-start gap-3 text-xs text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{deadCitationsCount} reference URLs could not be reached.</span> Try opening them in a browser — if broken, update to a working DOI before submission.
                    </div>
                  </div>
                )}

                {/* Citations List */}
                <div className="space-y-3 pt-2">
                  {citationsList.map((cit, idx) => {
                    const badge = getCitationStatusBadge(cit);
                    const link = cit.citation_primary_link || (cit.citation.match(/https?:\/\/[^\s]+/)?.[0]);

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${!badge.isLive ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50/80 border-slate-200/80'
                          }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="font-mono text-xs font-bold text-slate-400 w-5 shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="space-y-1 min-w-0">
                            <p className={`text-xs font-semibold ${!badge.isLive ? 'text-rose-900' : 'text-slate-800'}`}>
                              {cit.citation}
                            </p>
                            {link && (
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-[11px] font-mono hover:underline truncate block max-w-md ${!badge.isLive ? 'text-rose-600' : 'text-slate-400'
                                  }`}
                              >
                                {link}
                              </a>
                            )}
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 self-start sm:self-center ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

              </section>

            </div>

          </main>

          {/* ================= RIGHT SIDEBAR (AI EXPLANATION) ================= */}
          <aside className="w-full md:w-80 bg-white border-l border-slate-200/80 p-5 space-y-6 shrink-0 text-left print:hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-800">
                AI EXPLANATION
              </span>
            </div>

            {selectedIssue ? (
              /* Selected Issue Explanation Panel */
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${(selectedIssue.inconsistencyType || '').toLowerCase().includes('logic')
                      ? 'bg-purple-100 text-purple-800'
                      : (selectedIssue.inconsistencyType || '').toLowerCase().includes('redundancy')
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                    {selectedIssue.inconsistencyType || 'Inconsistency'}
                  </span>
                  <button
                    onClick={() => setSelectedIssueIndex(null)}
                    className="text-xs text-slate-400 hover:text-slate-700 transition-colors p-1"
                  >
                    Clear &times;
                  </button>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    {selectedIssue.sectionA || selectedIssue.section_a} ↔ {selectedIssue.sectionB || selectedIssue.section_b}
                  </h4>
                  <p className="text-xs text-slate-500 font-sans">
                    {selectedIssue.description}
                  </p>
                </div>

                {/* What was found */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    🔍 What Was Found:
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {selectedIssue.explanation_what || selectedIssue.description}
                  </p>
                </div>

                {/* Why it matters */}
                <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                    💡 Why It Matters:
                  </span>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    {selectedIssue.explanation_why || 'Creates cross-chapter logical disconnects.'}
                  </p>
                </div>

                {/* Suggested Fix */}
                <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                    🛠️ Suggested Fix:
                  </span>
                  <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                    {selectedIssue.howToFix || selectedIssue.suggested_fix || 'Harmonize descriptions across sections.'}
                  </p>
                </div>

                {/* Feedback */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Was this helpful?</span>
                  <div className="flex gap-2">
                    <button className="hover:text-indigo-600 transition-colors p-1" title="Helpful">👍</button>
                    <button className="hover:text-rose-600 transition-colors p-1" title="Not helpful">👎</button>
                  </div>
                </div>
              </div>
            ) : (
              /* Default Empty State */
              <div className="flex flex-col items-center justify-center text-center py-8 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] text-[#3b82f6] flex items-center justify-center">
                  <MousePointer className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900">Select a highlight</h4>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Click any colored phrase in the manuscript to see why it was flagged and how to fix it.
                  </p>
                </div>

                {/* Legend Cards */}
                <div className="w-full space-y-2 pt-4 text-left">
                  <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-2xl p-3.5 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-xs font-bold text-rose-900">Contradiction</span>
                    </div>
                    <span className="text-[11px] text-rose-700 block pl-3.5">Contradiction</span>
                  </div>

                  <div className="bg-[#f5f3ff] border border-[#ddd6fe] rounded-2xl p-3.5 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-xs font-bold text-purple-900">Logic Gap</span>
                    </div>
                    <span className="text-[11px] text-purple-700 block pl-3.5">Logic Gap</span>
                  </div>

                  <div className="bg-[#fffbeb] border border-[#fde68a] rounded-2xl p-3.5 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-amber-900">Redundancy</span>
                    </div>
                    <span className="text-[11px] text-amber-700 block pl-3.5">Redundancy</span>
                  </div>
                </div>
              </div>
            )}
          </aside>

        </div>
      ) : (
        /* Detailed Tabs View (Preserving all existing tab features) */
        <div className="p-6 space-y-6 max-w-7xl mx-auto w-full text-left">
          <div className="flex border-b border-slate-200">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 -mb-[2px] transition-all cursor-pointer ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs flex flex-col items-center justify-center text-center space-y-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">Coherence Score</span>
                  <ScoreRing score={displayScore} size={150} strokeWidth={12} />
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">Summary</span>
                  <p className="text-sm text-slate-700 leading-relaxed">{scan.overallAssessment}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inconsistencies' && (
            <div className="space-y-4">
              {inconsistenciesList.map((inc, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Flag {idx + 1}</span>
                  <h4 className="text-sm font-bold text-slate-800">{inc.sectionA || inc.section_a} ↔ {inc.sectionB || inc.section_b}</h4>
                  <p className="text-xs text-slate-600">{inc.explanation_what || inc.description}</p>
                  <p className="text-xs text-indigo-700 font-semibold">Suggested Fix: {inc.howToFix || inc.suggested_fix}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'strong_coherence' && (
            <div className="space-y-3">
              {allPairs.map((item, idx) => (
                <div key={idx} className="bg-white border rounded-xl p-4 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">{formatRoleLabel(item.role_a)} ↔ {formatRoleLabel(item.role_b)}</span>
                  <span className="font-mono font-bold text-indigo-600">Score: {item.score ?? 'N/A'}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'citations' && (
            <div className="space-y-3">
              {citationsList.map((cit, idx) => (
                <div key={idx} className="bg-white border rounded-xl p-4 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 truncate max-w-lg">{cit.citation}</span>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">{cit.status || 'Accessible'}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'originality' && aiText && (
            <div className="bg-white border rounded-xl p-6 space-y-3">
              <span className="text-xs font-bold text-slate-400 font-mono">Writing Style Reading</span>
              <p className="text-sm text-slate-700">{aiText.disclaimer || DEFAULT_AI_TEXT_DISCLAIMER}</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
