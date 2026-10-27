import { useState, useEffect, useRef, useMemo } from "react";
import type { Screen, DisplayScan } from '../../lib/appTypes';
import { ResultsHeader } from './ResultsHeader';
import { ManuscriptViewer } from './ManuscriptViewer';
import { ResultsScorePanel } from './ResultsScorePanel';
import { ASSESSMENT_ITEMS, CITATIONS, SAMPLE_PAIRS, SAMPLE_DISMISSED_PAIRS, SAMPLE_AI_TEXT, OVERALL_ASSESSMENT, SAMPLE_ADVISORY_DIMENSIONS, PARAGRAPHS } from '../../data/sampleReport';
import type { AssessmentType, AssessmentItem, Citation } from '../../data/sampleReport';
import type React from 'react';
import type { CitedReference, RolePairScore, AITextIndicator, ScoreBreakdown } from '../../types';
import { type ScanResponse, API_BASE_URL, authHeaders, fetchManuscript } from '../../services/api';
import { formatRoleLabel, PAR_SCORE } from '../../utils.js';

import { type ActiveResultsTab, type MobileResultsPane, type ReportSection, citationText, CITE_BADGE, SECTION_STATUS, sectionRole, buildReportSections, pairHasMissingSection, citationContains, extractDisplayTitle, normalizeManuscriptPreview } from './helpers';

export function ResultsScreen({ onNavigate, scan, isSample }: { onNavigate: (s: Screen) => void; scan?: DisplayScan | null; isSample?: boolean }) {
  const [activeSectionRole, setActiveSectionRole] = useState<string | null>(null);
  const [activePairKey, setActivePairKey] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<MobileResultsPane>("report");
  const [activeTab, setActiveTab] = useState<ActiveResultsTab>('overview');
  const [analysisTab, setAnalysisTab] = useState<'synthesis' | 'recommendations'>('synthesis');
  const [analysisExpanded, setAnalysisExpanded] = useState(true);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>({});
  const [feedbackPending, setFeedbackPending] = useState<Record<string, boolean>>({});
  const [feedbackError, setFeedbackError] = useState<Record<string, string>>({});
  const sectionPaneRef = useRef<HTMLDivElement>(null);
  const sectionReadingPositions = useRef<Record<string, number>>({});
  const [manuscriptText, setManuscriptText] = useState<string | null>(null);
  const [manuscriptLoading, setManuscriptLoading] = useState(false);
  const [manuscriptError, setManuscriptError] = useState<string | null>(null);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [citationFilter, setCitationFilter] = useState<Citation["status"] | null>(null);
  const [expandedIssueIds, setExpandedIssueIds] = useState<Set<string>>(new Set());

  const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

  useEffect(() => {
    if (!isSample && scan?.analysis_run_id && manuscriptText === null && !manuscriptError) {
      setManuscriptLoading(true);
      setManuscriptError(null);
      fetchManuscript(scan.analysis_run_id)
        .then(res => {
          if (res.available && res.text) setManuscriptText(normalizeManuscriptPreview(res.text));
          else if (res.reason === 'private') setManuscriptError("Document is no longer accessible");
          else if (res.reason === 'non_gdocs') setManuscriptError("Preview is only available for Google Docs");
          else if (res.reason === 'timeout') setManuscriptError("Manuscript preview timed out. Please try again.");
          else if (res.status) setManuscriptError(`Manuscript preview unavailable (HTTP ${res.status})`);
          else setManuscriptError("Manuscript preview unavailable");
        })
        .catch(() => setManuscriptError("Manuscript preview unavailable"))
        .finally(() => setManuscriptLoading(false));
    }
  }, [isSample, scan?.analysis_run_id, manuscriptText, manuscriptError]);

  const cleanedTitle = useMemo(() => extractDisplayTitle(manuscriptText), [manuscriptText]);

  const cleanedFilename = scan?.doc_url
    ? (scan.doc_url.startsWith('http')
        ? (() => {
            try {
              const url = new URL(scan.doc_url);
              if (url.hostname.toLowerCase() === 'docs.google.com' && /^\/document\/d\//i.test(url.pathname)) {
                return 'Google Docs manuscript';
              }
              return decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '')
                .replace(/\.(docx|pdf|doc)$/i, '') || null;
            } catch {
              return null;
            }
          })()
        : scan.doc_url.replace(/\.(docx|pdf|doc)$/i, ''))
    : null;

  const displayTitle = isSample
    ? "Predictors of Academic Burnout Among STEM Undergraduates in Philippine Universities"
    : (
        (scan as any)?.manuscript_title ||
        (scan as any)?.title ||
        cleanedTitle ||
        cleanedFilename ||
        "Document Coherence Scan"
      );

  const localItems: AssessmentItem[] = isSample ? ASSESSMENT_ITEMS : [
    ...(scan?.inconsistencies?.map((inc, i) => {
      const isMissingSection = !inc.section_b;
      return {
        id: inc.inconsistency_id || `inc-${i}`,
        type: (inc.finding_status === 'key_strength' ? "key-strength" : inc.finding_status === 'material_issue' ? "major-issue" : "affected-section") as AssessmentType,
        title: isMissingSection
          ? `Required section "${formatRoleLabel(inc.section_a)}"`
          : (inc.explanation_what ?? "").trim().replace(/\.$/, "") || "Finding",
        section: isMissingSection
          ? "Missing Section"
          : `${inc.section_a} ↔ ${inc.section_b}`,
        targetSectionIndex: 0,
        questionOrSubtitle: inc.finding_status === 'key_strength' ? "What the manuscript does consistently" : isMissingSection ? "Missing section" : (inc.section_b ? `Conflicts with: ${inc.section_b}` : "Finding"),
        description: inc.explanation_why || inc.explanation_what,
        significance: inc.finding_status === 'key_strength' ? "Supported cross-section alignment" : isMissingSection ? "Structural requirement" : "Requires attention",
        section_a: inc.section_a,
        explanation_what: inc.explanation_what,
        evidence: inc.evidence_a,
        evidence_verified: inc.evidence_verified,
        conflictsWith: isMissingSection ? undefined : inc.section_b,
        conflictQuote: isMissingSection ? undefined : inc.evidence_b,
        objectives_unaddressed: inc.objectives_unaddressed,
        recommendation: inc.suggested_fix,
        isMissingSection
      };
    }) || []),
    ...(scan?.verifications?.map((v, i) => ({
      id: `ver-${i}`,
      type: "strength" as AssessmentType,
      title: (v.note ?? "").slice(0, 50) || "Verified alignment",
      section: `${v.role_a} ↔ ${v.role_b}`,
      targetSectionIndex: 0,
      questionOrSubtitle: "Verified finding",
      description: v.note ?? "This section pair shows substantive alignment.",
      significance: "Strengthens the manuscript's overall coherence.",
      evidence: "",
      conflictsWith: "",
      conflictQuote: "",
      recommendation: "Preserve this coherent correspondence during panel presentation."
    })) || [])
  ];

  const scanWithRefs = scan as (ScanResponse & { references?: CitedReference[] }) | undefined;
  const rawCitationsList = (scan?.citations && scan.citations.length > 0)
    ? (scan.citations as CitedReference[])
    : (scanWithRefs?.references && scanWithRefs.references.length > 0)
      ? scanWithRefs.references
      : [];

  const localCitations: Citation[] = isSample
    ? CITATIONS
    : rawCitationsList.map((c: CitedReference, i) => {
        let status: Citation["status"] = "neutral";
        const s = c.citation_status || "";
        
        if (["verified_doi", "verified_url", "verified_metadata", "accessible"].includes(s) || c.status === "Accessible") {
          status = "live";
        } else if (["metadata_mismatch", "restricted", "bot_wall"].includes(s)) {
          status = "restricted";
        } else if (["unverified", "unknown_error", "no_link"].includes(s)) {
          status = "neutral";
        } else if (s === "broken" || c.status === "Broken Link") {
          status = "dead";
        } else if (c.citation_is_accessible) {
          status = "live";
        }

        return {
          id: `cit-${i}`,
          ref: citationText(c.citation_raw_reference_text || c.citation || ""),
          url: c.citation_primary_link || "",
          status,
          title: citationText(c.citation_crossref_title),
          authors: citationText(c.citation_authors_parsed),
          year: c.citation_year_parsed
        };
      });

  const localParagraphs: typeof PARAGRAPHS = isSample ? PARAGRAPHS : (scan?.inconsistencies ?? []).flatMap((inc, i) => {
     const itemId = inc.inconsistency_id || `inc-${i}`;
     const t = (inc.finding_status === 'key_strength' ? "key-strength" : (inc.coherence_score || 0) < 60 ? "major-issue" : "affected-section") as AssessmentType;
     const p: typeof PARAGRAPHS = [];
     if (inc.section_a) p.push({
       type: "section", chapter: "", heading: inc.section_a, text: inc.evidence_a || inc.explanation_what,
       assessments: [{ itemId, type: t, phrase: inc.evidence_a || inc.explanation_what }]
     });
     if (inc.section_b) p.push({
       type: "section", chapter: "", heading: inc.section_b, text: inc.evidence_b || inc.explanation_why,
       assessments: [{ itemId, type: t, phrase: inc.evidence_b || inc.explanation_why }]
     });
     return p;
  });

  const findingsCount = isSample ? localItems.length : (scan?.inconsistencies?.length ?? 0);
  const sectionsCount = isSample
    ? new Set(localParagraphs.filter(para => para.assessments.length > 0).map(para => para.heading)).size
    : new Set((scan?.inconsistencies ?? []).flatMap(inc => [inc.section_a, inc.section_b]).filter(Boolean).map(section => section.trim().toLowerCase())).size;
  const recommendations = isSample
    ? localItems.filter(item => item.evidence?.trim() && item.recommendation?.trim())
        .map(item => ({ id: item.id, quote: item.evidence!, revision: item.recommendation }))
    : (scan?.inconsistencies ?? []).flatMap((inc, index) => {
        const quote = inc.evidence_a?.trim() || inc.evidence_b?.trim();
        return quote && inc.suggested_fix?.trim() ? [{ id: inc.inconsistency_id || `inc-${index}`, quote, revision: inc.suggested_fix.trim() }] : [];
      });

  const reportSections = useMemo(() => isSample
    ? PARAGRAPHS.map((para, index): ReportSection => ({ key: `${index}:${sectionRole(para.heading)}`, name: para.heading,
        role: sectionRole(para.heading), text: para.text, status: para.text.split(/\s+/).length >= 40 ? 'Present' : 'Stub' }))
    : buildReportSections(scan?.template_toc || [], scan?.sections_analyzed || [], scan?.missing_sections || [], manuscriptText),
    [isSample, scan, manuscriptText]);
  const activeSection = reportSections.find(section => section.key === activeSectionRole);

  useEffect(() => {
    if (activeSectionRole && sectionPaneRef.current && (mobilePane === 'xai' || isDesktop())) sectionPaneRef.current.scrollTop = sectionReadingPositions.current[activeSectionRole] || 0;
  }, [activeSectionRole, mobilePane]);

  function sectionFindings(section: ReportSection) {
    if (isSample) {
      const para = PARAGRAPHS.find(p => sectionRole(p.heading) === section.role);
      return localItems.filter(item => para?.assessments.some(assessment => assessment.itemId === item.id));
    }
    return localItems.filter(item => scan?.inconsistencies.some((inc, index) =>
      (inc.inconsistency_id || `inc-${index}`) === item.id &&
      (sectionRole(inc.section_a) === section.role || sectionRole(inc.section_b || '') === section.role)) ||
      scan?.verifications?.some((v, index) => item.id === `ver-${index}` &&
        (sectionRole(v.role_a) === section.role || sectionRole(v.role_b) === section.role)));
  }

  function renderSectionText(section: ReportSection) {
    const matches = section.key === 'full-manuscript'
      ? localItems.flatMap(item => [item.evidence, item.conflictQuote]
          .filter((phrase): phrase is string => !!phrase?.trim())
          .map(phrase => ({ phrase, type: item.type })))
      : isSample
      ? (PARAGRAPHS.find(p => sectionRole(p.heading) === section.role)?.assessments || [])
      : sectionFindings(section).flatMap(item => [item.evidence, item.conflictQuote]
          .filter((phrase): phrase is string => !!phrase?.trim())
          .map(phrase => ({ phrase, type: item.type })));
    const ordered = matches.map(match => ({ ...match, index: section.text.indexOf(match.phrase) }))
      .filter(match => match.index >= 0).sort((a, b) => a.index - b.index);
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    ordered.forEach((match, index) => {
      if (match.index < cursor) return;
      nodes.push(section.text.slice(cursor, match.index));
      nodes.push(<mark key={index} className={ST[match.type].hl}>{match.phrase}</mark>);
      cursor = match.index + match.phrase.length;
    });
    nodes.push(section.text.slice(cursor));
    return nodes;
  }

  const score = isSample ? 74 : scan?.overall_coherence_score || 0;
  const displayBand = isSample ? "Moderate Coherence" : scan?.score_breakdown?.band;
  const v6Dimensions = (scan?.score_breakdown as ScoreBreakdown | undefined)?.v6_dimensions;
  const advisoryDimensions = ([
    ['objectives_alignment', 'Objectives alignment', 'bg-amber-500'],
    ['methodology_fit', 'Methodology fit', 'bg-emerald-500'],
    ['numeric_consistency', 'Numeric consistency', 'bg-rose-500'],
    ['claim_support', 'Claim support', 'bg-blue-500'],
  ] as const).map(([key, label, color]) => {
    const values = Object.values(v6Dimensions ?? {}).map(pair => pair?.[key])
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1);
    return { key, label, color, value: isSample ? SAMPLE_ADVISORY_DIMENSIONS[key] : values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null };
  });
  const dead = localCitations.filter(c => c.status === "dead").length;
  type STEntry = { hl: string; pill: string; accentColor: string; label: string };
  const ST: Record<AssessmentType, STEntry> = {
    "overall-status": {
      hl: "bg-amber-200 rounded px-0.5",
      pill: "bg-surface-warn border border-amber-200 text-amber-800",
      accentColor: "#d97706", label: "Overall Status",
    },
    strength: {
      hl: "bg-emerald-200 rounded px-0.5",
      pill: "bg-surface-success border border-emerald-200 text-emerald-800",
      accentColor: "#059669", label: "Verified Alignment",
    },
    "key-strength": {
      hl: "bg-emerald-200 rounded px-0.5",
      pill: "bg-surface-success border border-emerald-200 text-emerald-800",
      accentColor: "#059669", label: "Key Strength",
    },
    "major-issue": {
      hl: "bg-rose-200 rounded px-0.5",
      pill: "bg-surface-error border border-rose-200 text-rose-800",
      accentColor: "#e11d48", label: "Major Issue",
    },
    "affected-section": {
      hl: "bg-blue-200 rounded px-0.5",
      pill: "bg-surface-info border border-blue-200 text-blue-800",
      accentColor: "#2563eb", label: "Affected Section",
    },
  };

  const strongestAlignment = localItems.find(i => i.type === "key-strength" || i.type === "strength");
  const needsAttention = localItems.find(i => i.type === "major-issue");
  const synthesis = isSample ? OVERALL_ASSESSMENT.statusDescription : scan?.score_breakdown?.biggest_lever?.reason;

  function renderPara(para: typeof localParagraphs[0]) {
    if (!para.assessments.length) return <>{para.text}</>;
    let txt = para.text;
    const parts: React.ReactNode[] = [];
    para.assessments.forEach(({ phrase, type, itemId }) => {
      const idx = txt.indexOf(phrase);
      if (idx === -1) return;
      parts.push(txt.slice(0, idx));
      parts.push(
        <mark key={itemId + phrase}
          className={ST[type].hl}>
          {phrase}
        </mark>
      );
      txt = txt.slice(idx + phrase.length);
    });
    parts.push(txt);
    return <>{parts}</>;
  }

  // ── Tab data ──
  const inconsistencyItems = localItems.filter(i => i.type === "key-strength" || i.type === "major-issue" || i.type === "affected-section");
  const visibleInconsistencies = inconsistencyItems;
  const inconsistenciesCount = inconsistencyItems.length;

  const toggleIssueExpanded = (id: string) => {
    setExpandedIssueIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allExpanded = visibleInconsistencies.length > 0 && visibleInconsistencies.every(item => expandedIssueIds.has(item.id));
  const toggleAllExpanded = () => {
    if (allExpanded) setExpandedIssueIds(new Set());
    else setExpandedIssueIds(new Set(visibleInconsistencies.map(i => i.id)));
  };

  type EnrichedPair = RolePairScore & {
    verification?: { alignment: string; note: string };
    dismissalReason?: string;
  };

  const SAMPLE_VERIFICATIONS: Record<string, { alignment: 'substantive' | 'superficial'; note: string }> = {
    "introduction|objectives": {
      alignment: "substantive",
      note: "Research gap identified in the introduction directly motivates each specific research objective."
    },
    "objectives|methodology": {
      alignment: "substantive",
      note: "Methodology directly addresses all specific objectives with appropriate instruments and analytical procedures."
    },
    "methodology|results": {
      alignment: "substantive",
      note: "All statistical tests specified in Chapter 3 are executed and reported in Chapter 4."
    }
  };

  const verificationByPair = new Map(
    (scan?.verifications ?? []).map(v => [`${v.role_a}|${v.role_b}`, v] as const)
  );
  const dismissalByPair = new Map<string, string>(
    (isSample ? SAMPLE_DISMISSED_PAIRS : scan?.score_breakdown?.coherence_detail?.dismissed_pairs ?? [])
      .map(p => [`${p.role_a}|${p.role_b}`, p.reason] as const)
  );
  const allPairs: EnrichedPair[] = (
    isSample
      ? (SAMPLE_PAIRS as EnrichedPair[])
      : ((scan?.score_breakdown?.coherence_detail?.pair_scores ?? []) as RolePairScore[])
  )
    .map(p => ({
      ...p,
      verification: isSample
        ? SAMPLE_VERIFICATIONS[`${p.role_a}|${p.role_b}`]
        : verificationByPair.get(`${p.role_a}|${p.role_b}`),
      dismissalReason: dismissalByPair.get(`${p.role_a}|${p.role_b}`)
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const visiblePairs = allPairs;
  const pairsCount = allPairs.length;
  const activePair = activePairKey ? allPairs.find(p => `${p.role_a}__${p.role_b}` === activePairKey) ?? null : null;

  const citationsCount = localCitations.length;
  const citeCount = (s: Citation["status"]) => localCitations.filter(c => c.status === s).length;
  const displayedCitations = citationFilter ? localCitations.filter(c => c.status === citationFilter) : localCitations;

  function renderCitation(cite: Citation) {
    const link = /^https?:\/\//i.test(cite.url)
      ? <a href={cite.url} target="_blank" rel="noopener noreferrer" className="citation-text text-indigo-700 hover:underline">{cite.url}</a>
      : <span>{cite.url}</span>;
    const parts = cite.url ? cite.ref.split(cite.url) : [cite.ref];
    return (
      <div className="flex-1 min-w-0 citation-text text-[13px] text-gray-800 leading-relaxed">
        {cite.title && !citationContains(cite.ref, cite.title) && <p className="font-bold">{cite.title}</p>}
        {cite.authors && !citationContains(cite.ref, cite.authors) && <p>{cite.authors}</p>}
        {cite.year && !citationContains(cite.ref, cite.year) && <p>{cite.year}</p>}
        <p>{parts[0]}{parts.length > 1 && link}{parts.slice(1).join('')}</p>
        {cite.url && parts.length === 1 && <p className="mt-1">{link}</p>}
      </div>
    );
  }

  const aiText: AITextIndicator | null = isSample ? SAMPLE_AI_TEXT : (scan?.ai_text_indicator ?? null);

  const tabList: Array<{ id: ActiveResultsTab; label: string }> = [
    { id: 'overview',         label: 'Overview' },
    { id: 'inconsistencies',  label: `Findings (${inconsistenciesCount})` },
    { id: 'strong_coherence', label: `Coherence Pairs (${pairsCount})` },
    { id: 'citations',        label: `Citations (${citationsCount})` },
  ];

  // Feedback is only valid for inconsistency findings that exist in the DB.
  // Strengths ("ver-N") and the sample overall-status card are excluded.
  const canGiveFeedback = (it: AssessmentItem | null): it is AssessmentItem =>
    !!it &&
    (it.type === "key-strength" || it.type === "major-issue" || it.type === "affected-section") &&
    (isSample || !!scan?.inconsistencies?.some(i => i.inconsistency_id === it.id));

  async function handleFeedback(item: AssessmentItem, helpful: boolean) {
    if (feedbackMap[item.id] || feedbackPending[item.id]) return;          // one vote per finding
    if (!canGiveFeedback(item)) return;
    if (isSample) {                                                         // sample: local only, no network
      setFeedbackMap(p => ({ ...p, [item.id]: helpful ? 'up' : 'down' }));
      return;
    }
    const userId = scan?.user_id;
    if (!userId) return;

    setFeedbackPending(p => ({ ...p, [item.id]: true }));
    setFeedbackError(p => { const n = { ...p }; delete n[item.id]; return n; });
    try {
      const res = await fetch(`${API_BASE_URL}/api/issues/${encodeURIComponent(item.id)}/feedback`, {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json', 'X-User-Id': userId }),
        body: JSON.stringify({ helpful }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);                   // fetch does not throw on 4xx/5xx
      setFeedbackMap(p => ({ ...p, [item.id]: helpful ? 'up' : 'down' }));
    } catch (err) {
      console.error('Failed to submit issue feedback:', err);
      setFeedbackError(p => ({ ...p, [item.id]: 'Could not save feedback. Please try again.' }));
    } finally {
      setFeedbackPending(p => ({ ...p, [item.id]: false }));
    }
  }

  // Single feedback widget used by BOTH the Inconsistencies cards and the right-pane XAI card.
  function renderFeedback(item: AssessmentItem) {
    if (!canGiveFeedback(item)) return null;
    const vote = feedbackMap[item.id];
    const locked = !!vote || !!feedbackPending[item.id];
    const btn = (kind: 'up' | 'down', helpful: boolean, icon: React.ReactNode, label: string, activeCls: string) => (
      <button
        type="button"
        disabled={locked}
        aria-pressed={vote === kind}
        aria-label={label}
        title={label}
        onClick={e => { e.stopPropagation(); handleFeedback(item, helpful); }}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
          vote === kind ? activeCls : 'bg-white border-gray-200 text-gray-600'
        } ${locked ? `cursor-not-allowed ${vote === kind ? '' : 'opacity-40'}` : 'cursor-pointer hover:bg-gray-50 hover:border-gray-300'}`}>
        <span>{icon}</span><span>{label}</span>
      </button>
    );
    const thumbUpIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true">
        <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
      </svg>
    );
    const thumbDownIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true">
        <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h3a2 2 0 012 2v7a2 2 0 01-2 2h-3" />
      </svg>
    );
    return (
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap" onClick={e => e.stopPropagation()} aria-live="polite">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Was this finding helpful?</span>
          {vote && <span className="text-[11px] text-emerald-700">Thanks — feedback recorded.</span>}
          {feedbackError[item.id] && <span className="text-[11px] text-rose-600">{feedbackError[item.id]}</span>}
        </div>
        <div className="flex items-center gap-2">
          {btn('up', true, thumbUpIcon, 'Helpful', 'bg-emerald-50 border-emerald-300 text-emerald-700')}
          {btn('down', false, thumbDownIcon, 'Not helpful', 'bg-rose-50 border-rose-300 text-rose-700')}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen h-dvh flex flex-col overflow-hidden bg-gray-50 print:h-auto print:overflow-visible font-sans">

      {/* ── Print-only summary block ── */}
      <div className="hidden print:block p-8 border-b-2 border-gray-900 bg-white mb-6 break-inside-avoid-page">
        <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resync Manuscript Coherence Report</h1>
            <h2 className="text-lg text-gray-700 font-medium mt-1">{displayTitle}</h2>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-700">{Math.round(score)} / 100</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              Band: {isSample ? "Moderate Coherence" : (scan?.score_breakdown?.band || "Pending")}
            </div>
            <div className="text-xs text-gray-500 mt-1">{new Date().toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-4">
          <div>
            <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-2">Key Strengths</h3>
            {isSample ? (
              <ul className="text-xs text-gray-700 space-y-1.5 list-disc pl-4">
                {OVERALL_ASSESSMENT.strengths.map((str, idx) => (
                  <li key={idx}>{str}</li>
                ))}
              </ul>
            ) : (scan?.inconsistencies?.some(i => i.finding_status === 'key_strength') || (scan?.verifications && scan.verifications.length > 0)) ? (
              <ul className="text-xs text-gray-700 space-y-1.5 list-disc pl-4">
                {scan?.inconsistencies?.filter(i => i.finding_status === 'key_strength').map((inc, idx) => (
                  <li key={`strength-${idx}`}><strong>{inc.section_a} ↔ {inc.section_b}:</strong> {inc.explanation_what || inc.explanation_why}</li>
                ))}
                {scan?.verifications?.map((v, idx) => (
                  <li key={idx}><strong>{v.role_a} ↔ {v.role_b}:</strong> {v.note || "Aligned"}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500 italic">
                Strengths can only be verified when the manuscript contains both sections in a comparable pair. Missing from this manuscript: {(scan?.missing_sections && scan.missing_sections.length > 0) ? scan.missing_sections.join(', ') : 'None (no comparable pairs met verification threshold)'}.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider mb-2">Major Issues</h3>
            {isSample ? (
              <ul className="text-xs text-gray-700 space-y-1.5 list-disc pl-4">
                {OVERALL_ASSESSMENT.majorIssues.map((iss, idx) => (
                  <li key={idx}>{iss}</li>
                ))}
              </ul>
            ) : (scan?.inconsistencies?.filter(i => i.finding_status === 'material_issue').length ?? 0) > 0 ? (
              <ul className="text-xs text-gray-700 space-y-1.5 list-disc pl-4">
                {scan?.inconsistencies?.filter(i => i.finding_status === 'material_issue').map((inc, idx) => (
                  <li key={idx}>
                    <strong>{inc.section_a} ↔ {inc.section_b}:</strong> {inc.explanation_what || inc.explanation_why}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500 italic">No major issues detected.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Navbar ── */}
      <div className="hidden print:block p-8 space-y-6">
        <h2 className="text-lg font-bold">All findings and recommendations</h2>
        {localItems.map(item => (
          <section key={item.id} className="space-y-2">
            <h3 className="font-bold">{item.title}</h3>
            <p>{item.section}</p><p>{item.description}</p><p>{item.significance}</p>
            {item.evidence && <p>{item.evidence}</p>}
            {item.conflictQuote && <p>{item.conflictQuote}</p>}
            <p>{item.recommendation}</p>
          </section>
        ))}
      </div>
      <ResultsHeader onNavigate={onNavigate} isSample={isSample} displayTitle={displayTitle} setShowPairingModal={setShowPairingModal} />

      {/* ── Results body ── */}
      <main className="flex-1 flex overflow-hidden print:h-auto print:overflow-visible print:block relative">

        {/* Manuscript stays visible independently of the analysis tabs. */}
        <ManuscriptViewer mobilePane={mobilePane} isSample={isSample} displayTitle={displayTitle} displayBand={displayBand} findingsCount={findingsCount} sectionsCount={sectionsCount} manuscriptLoading={manuscriptLoading} manuscriptText={manuscriptText} manuscriptError={manuscriptError} localParagraphs={localParagraphs} localCitations={localCitations} dead={dead} ST={ST} renderPara={renderPara} renderSectionText={renderSectionText} renderCitation={renderCitation} scan={scan} />

        {/* ══ RIGHT: Explainable AI & Recommendations Panel ══ */}
        <div className={`${mobilePane === "xai" ? "flex w-full" : "hidden"} print-force-visible print:block print:w-full print:h-auto print:overflow-visible print:border-none print:static lg:flex shrink-0 bg-white flex-col overflow-hidden lg:w-[360px] xl:w-[420px] 2xl:w-[460px] border-l border-gray-100`}>
          <div ref={sectionPaneRef} className="flex-1 overflow-y-auto"
            onScroll={e => { if (activeSectionRole && e.currentTarget.clientHeight > 0) sectionReadingPositions.current[activeSectionRole] = e.currentTarget.scrollTop; }}>
          {/* Score ring */}
           <ResultsScorePanel score={score} displayBand={displayBand} advisoryDimensions={advisoryDimensions} />

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
                  <p className="text-sm leading-relaxed text-gray-600">{synthesis || 'No synthesis summary is available for this scan.'}</p>
          <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-1 gap-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-2.5">
              <span className="text-emerald-700 text-base leading-none" aria-hidden="true">✓</span>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-emerald-900">Strongest Alignment</h4>
                <p className="text-xs text-emerald-800 truncate" title={strongestAlignment?.title}>{strongestAlignment?.title || "No verified alignment yet"}</p>
              </div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-start gap-2.5">
              <span className="text-rose-700 text-base leading-none" aria-hidden="true">!</span>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-rose-900">Needs Attention</h4>
                <p className="text-xs text-rose-800 truncate" title={needsAttention?.title}>{needsAttention?.title || "No major issue found"}</p>
              </div>
            </div>
          </div>

                </div>}
                {analysisTab === 'recommendations' && <div className="space-y-4">
                  {recommendations.length ? recommendations.map((recommendation, index) => (
                    <div key={recommendation.id} className="flex items-start gap-3">
                      <span className="rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-bold px-2 py-1.5 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                      <div className="min-w-0 flex-1 rounded-xl bg-gray-50 p-3 space-y-2">
                        <div className="rounded-lg bg-gray-100 p-3"><p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">Original sentence</p><p className="text-xs text-gray-700 leading-relaxed">“{recommendation.quote}”</p></div>
                        <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3"><p className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 mb-1">Recommended revision</p><p className="text-xs text-gray-700 leading-relaxed">{recommendation.revision}</p></div>
                      </div>
                    </div>
                  )) : <p className="text-sm text-gray-500">No findings have both a manuscript quote and a suggested fix.</p>}
                </div>}
              </div>
              <div className="border-t border-gray-100">
          <div className="bg-white border-b border-gray-200 px-3 flex items-center gap-1 overflow-x-auto xl:overflow-visible shadow-2xs shrink-0 print:hidden" role="tablist" aria-label="Results tabs">
            {tabList.map(tab => (
              <button
                key={tab.id}
                id={`results-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls="results-tab-panel"
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={e => {
                  const index = tabList.findIndex(item => item.id === tab.id);
                  const next = e.key === 'ArrowRight' ? (index + 1) % tabList.length
                    : e.key === 'ArrowLeft' ? (index - 1 + tabList.length) % tabList.length
                    : e.key === 'Home' ? 0 : e.key === 'End' ? tabList.length - 1 : -1;
                  if (next < 0) return;
                  e.preventDefault();
                  setActiveTab(tabList[next].id);
                  document.getElementById(`results-tab-${tabList[next].id}`)?.focus();
                }}
                className={`px-3.5 py-3 text-xs font-bold border-b-2 -mb-px transition-colors duration-150 cursor-pointer whitespace-nowrap tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ${
                  activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
                <div id="results-tab-panel" role="tabpanel" aria-labelledby={`results-tab-${activeTab}`} tabIndex={0} className="px-4 py-5">
                  {activeTab === 'overview' && <div className="space-y-2"><h3 className="text-sm font-bold text-slate-900">Report by section</h3>{reportSections.map(section => <button key={section.key} type="button" onClick={() => setActiveSectionRole(section.key)} className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-indigo-600"><span className="truncate text-gray-800">{section.name}</span><span className={`shrink-0 ${SECTION_STATUS[section.status].color}`}>{section.status === 'Unassessed' ? 'Not checked yet' : section.status}</span></button>)}</div>}
            {activeTab === 'inconsistencies' && (
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
            )}

            {/* ── Coherence Pairs tab ── */}
            {activeTab === 'strong_coherence' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                  <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">
                    Coherence pairs ({visiblePairs.length}) · target = {PAR_SCORE}
                  </p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setShowPairingModal(true)} className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">How pairing works</button>
                  </div>
                </div>

                <p className="text-xs text-gray-600 px-1">How well each section matches the one it should.</p>

                {visiblePairs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 px-6 py-10 text-center">
                    <p className="text-sm font-bold text-gray-800 mb-1">No role pairs to show</p>
                    <p className="text-xs text-gray-500">
                      {pairsCount === 0
                        ? 'No coherence pairs were evaluated for this scan. Required sections may be missing.'
                        : `No pairs meet the target score of ${PAR_SCORE}.`}
                    </p>
                  </div>
                ) : (
                  visiblePairs.map((p, idx) => {
                    const key = `${p.role_a}__${p.role_b}`;
                    const isSelected = activePairKey === key;
                    const score = p.score ?? 0;
                    const strong = score >= PAR_SCORE;
                    const sectionMissing = !isSample && pairHasMissingSection(p, scan?.sections_analyzed || []);
                    const hasScore = !sectionMissing && p.included !== false && p.score != null;
                    return (
                      <div
                        key={`${p.role_a}|${p.role_b}|${idx}`}
                        onClick={() => {
                          setActivePairKey(prev => prev === key ? null : key);
                          setActiveSectionRole(null);
                          if (!isDesktop()) setMobilePane("xai");
                        }}
                        className={`bg-white rounded-2xl border p-5 space-y-3 cursor-pointer transition-all hover:border-indigo-300 ${
                          isSelected ? 'border-indigo-400 ring-2 ring-indigo-300 shadow-sm' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-gray-900">{formatRoleLabel(p.role_a)} ↔ {formatRoleLabel(p.role_b)}</p>
                          <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${strong ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                            {sectionMissing ? "Can't compare — section missing" : hasScore ? `${strong ? 'Strong' : 'Needs work'} · ${Math.round(score)}` : 'Not checked yet'}
                          </span>
                        </div>
                        {hasScore && <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${strong ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
                        </div>}
                        <p className="text-[11px] text-gray-500">Counts for {Math.round(p.weight * 100)}% of the overall score</p>
                        {p.verification && (
                          <p className={`text-xs leading-relaxed rounded-xl border px-3 py-2 ${
                            p.verification.alignment === 'superficial' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          }`}>
                            <span className="font-bold capitalize">{p.verification.alignment} alignment.</span> {p.verification.note}
                          </p>
                        )}
                        {p.included && !sectionMissing && p.dismissalReason && (
                          <p className="text-xs leading-relaxed rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
                            <span className="font-bold">No material inconsistency found.</span> {p.dismissalReason.replaceAll('embedding-similarity score', 'text-similarity score')}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Citations tab ── */}
            {activeTab === 'citations' && (
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
            )}

                </div>
              </div>
            </div>}
          </section>

            {activeSection ? (
              <div className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{activeSection.name}</h2>
                  <span className={`text-sm font-semibold ${SECTION_STATUS[activeSection.status].color}`}>{activeSection.status === 'Unassessed' ? 'Not checked yet' : activeSection.status}</span>
                </div>
                {activeSection.status === 'Missing' || activeSection.status === 'Unassessed' ? (
                  <p className="text-sm text-gray-700">This section was not detected in the manuscript.</p>
                ) : (
                  <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed break-words">{renderSectionText(activeSection)}</div>
                )}
                <h3 className="text-sm font-bold text-gray-900">Findings on this section</h3>
                {sectionFindings(activeSection).map(item => {
                  const finding = scan?.inconsistencies.find(inc => inc.inconsistency_id === item.id || `inc-${scan.inconsistencies.indexOf(inc)}` === item.id);
                  return (
                    <div key={item.id} className="rounded-xl border border-gray-200 p-4 space-y-3 text-sm text-gray-700">
                      <h4 className="font-bold text-indigo-700">{item.title}</h4>
                      <p>{finding?.explanation_what || item.questionOrSubtitle}</p>
                      <p>{finding?.explanation_why || item.description}</p>
                      {item.recommendation && <p><strong>Suggested fix: </strong>{item.recommendation}</p>}
                      {renderFeedback(item)}
                    </div>
                  );
                })}
                {!sectionFindings(activeSection).length && <p className="text-sm text-gray-600">No findings were returned for this section.</p>}
              </div>
            ) : activePair ? (() => {
              const score = activePair.score ?? 0;
              const strong = score >= PAR_SCORE;
              const isIncluded = activePair.included !== false;
              const sectionMissing = !isSample && pairHasMissingSection(activePair, scan?.sections_analyzed || []);
              return (
                <div className="px-6 py-6 space-y-5">
                  {/* Pair header */}
                  <div className="rounded-2xl p-5 border-2 border-indigo-200 bg-indigo-50/40">
                    <div className="flex items-start justify-between mb-2.5">
                      <span className="text-[10px] mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                        Role Pair Analysis
                      </span>
                      <button
                        type="button"
                        onClick={() => setActivePairKey(null)}
                        aria-label="Close pair details"
                        className="text-gray-400 hover:text-gray-700 transition-colors -mt-0.5 p-1 rounded-lg hover:bg-black/5 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4" aria-hidden="true">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug mb-1">
                      {formatRoleLabel(activePair.role_a)} ↔ {formatRoleLabel(activePair.role_b)}
                    </h3>
                    <p className="text-xs text-indigo-700 font-medium">
                      Counts for <span className="tabular-nums">{Math.round(activePair.weight * 100)}%</span> of the overall score
                    </p>
                  </div>

                  {/* Score block */}
                  {!sectionMissing && isIncluded && activePair.score != null && <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs mono font-bold uppercase tracking-wider text-gray-500">
                        Pair Coherence Score
                      </span>
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        strong ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sectionMissing ? "Can't compare — section missing" : strong ? 'Strong' : 'Needs work'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold mono text-gray-900 tabular-nums">
                      {Math.round(score)} <span className="text-sm font-normal text-gray-400">/ 100</span>
                    </p>
                    <div
                      className="h-2 rounded-full bg-gray-200 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={Math.round(score)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Pair coherence score"
                    >
                      <div
                        className={`h-full rounded-full transition-all ${strong ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                      />
                    </div>
                  </div>}

                  {/* Missing section check / Verification Note */}
                  {sectionMissing || !isIncluded ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 font-medium leading-relaxed">
                      This pair could not be evaluated — one or both sections are missing.
                    </div>
                  ) : activePair.dismissalReason ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 leading-relaxed">
                      <p className="font-bold mb-1">No material inconsistency found</p>
                      <p>{activePair.dismissalReason.replaceAll('embedding-similarity score', 'text-similarity score')}</p>
                    </div>
                  ) : activePair.verification ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          activePair.verification.alignment === 'superficial'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        }`}>
                          {activePair.verification.alignment === 'substantive' ? 'Substantive Alignment' : 'Superficial Alignment'}
                        </span>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs">
                        <p className="text-xs sm:text-[13px] text-gray-700 leading-relaxed">
                          {activePair.verification.note.replaceAll('embedding-similarity score', 'text-similarity score')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
                        No detailed alignment note available for this pair.
                      </div>
                      {activePair.reason && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1 shadow-2xs">
                          <p className="text-[10px] mono font-bold uppercase tracking-wider text-gray-400">
                            Assessment Rationale
                          </p>
                          <p className="text-xs sm:text-[13px] text-gray-700 leading-relaxed">
                            {activePair.reason}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
                        })() : null}
          </div>
        </div>

      </main>

      {/* ── Mobile bottom navigation bar ── */}
      <nav className="lg:hidden shrink-0 grid grid-cols-2 border-t border-gray-200 bg-white print:hidden z-30" aria-label="Mobile report panes">
        {([
          { id: "report" as const, label: "Manuscript" },
          { id: "xai" as const, label: "Analysis" },
        ]).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobilePane(id)}
            aria-current={mobilePane === id ? "page" : undefined}
            className={`py-3 text-xs font-bold transition-colors ${
              mobilePane === id
                ? "text-indigo-600 border-t-2 border-indigo-600 -mt-px bg-indigo-50/30"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ── Pairing Modal ── */}
      {showPairingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowPairingModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-base font-bold text-gray-900">How Section Pairing Works</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Resync evaluates cross-chapter alignment across 7 weighted academic role pairs calibrated to standard defense criteria.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPairingModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer shrink-0 ml-3"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {[
                { pair: "Objectives ↔ Methodology", weight: "22%", desc: "checks methodological alignment" },
                { pair: "Methodology ↔ Results", weight: "20%", desc: "verifies data matches procedures" },
                { pair: "Results ↔ Discussion", weight: "16%", desc: "ensures claims grounded in findings" },
                { pair: "Objectives ↔ Conclusion", weight: "16%", desc: "confirms research questions are resolved" },
                { pair: "Introduction ↔ Objectives", weight: "12%", desc: "validates research gap" },
                { pair: "Abstract ↔ Conclusion", weight: "8%", desc: "executive summary coverage" },
                { pair: "Discussion ↔ Conclusion", weight: "6%", desc: "logical progression" },
              ].map(({ pair, weight, desc }) => (
                <div key={pair} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-gray-900">{pair}</p>
                    <p className="text-[11px] text-gray-600">{desc}</p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-black mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {weight}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPairingModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
