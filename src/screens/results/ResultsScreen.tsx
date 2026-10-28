import { useEffect, useState } from 'react';
import type React from 'react';
import type { Screen } from '../../lib/appTypes';
import type { V7ScanResponse, V7Inconsistency } from '../../services/v7Result';
import { API_BASE_URL, authHeaders, fetchManuscript } from '../../services/api';
import { SAMPLE_MANUSCRIPT, SAMPLE_REPORT, type Citation } from '../../data/sampleReport';
import { ResultsHeader } from './ResultsHeader';
import { ResultsScorePanel } from './ResultsScorePanel';
import { CoherenceAnalysis } from './CoherenceAnalysis';
import { OverviewTab } from './OverviewTab';
import { FindingsTab } from './FindingsTab';
import { CoherencePairsTab, PairScores } from './CoherencePairsTab';
import { CitationsTab } from './CitationsTab';
import { buildReportSections, citationAccess, citationContains, citationText, extractDisplayTitle, normalizeManuscriptPreview } from './helpers';
import { verifiedQuoteRanges } from './highlights';

type Tab = 'overview' | 'inconsistencies' | 'strong_coherence' | 'citations';

export function ResultsScreen({ onNavigate, onBack, scan, isSample }: { onNavigate: (screen: Screen) => void; onBack: () => void; scan?: V7ScanResponse | null; isSample?: boolean }) {
  const result = isSample ? SAMPLE_REPORT : scan;
  const [manuscriptText, setManuscriptText] = useState<string | null>(isSample ? SAMPLE_MANUSCRIPT : null);
  const [manuscriptError, setManuscriptError] = useState<string | null>(null);
  const [manuscriptLoading, setManuscriptLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [analysisTab, setAnalysisTab] = useState<'synthesis' | 'recommendations'>('synthesis');
  const [analysisExpanded, setAnalysisExpanded] = useState(true);
  const [mobilePane, setMobilePane] = useState<'report' | 'xai'>('report');
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(null);
  const [activePairKey, setActivePairKey] = useState<string | null>(null);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [citationFilter, setCitationFilter] = useState<Citation['status'] | null>(null);
  const [expandedIssueIds, setExpandedIssueIds] = useState<Set<string>>(new Set());
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>({});
  const [feedbackPending, setFeedbackPending] = useState<Record<string, boolean>>({});
  const [feedbackError, setFeedbackError] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isSample || !result?.analysis_run_id) return;
    let cancelled = false;
    setManuscriptLoading(true);
    fetchManuscript(result.analysis_run_id).then(response => {
      if (cancelled) return;
      if (response.available && response.text) setManuscriptText(normalizeManuscriptPreview(response.text));
      else if (response.reason === 'private') setManuscriptError('Document is no longer accessible');
      else if (response.reason === 'non_gdocs') setManuscriptError('Preview is only available for Google Docs');
      else if (response.reason === 'timeout') setManuscriptError('Manuscript preview timed out. Please try again.');
      else if (response.status) setManuscriptError(`Manuscript preview unavailable (HTTP ${response.status})`);
      else setManuscriptError('Manuscript preview unavailable');
    }).catch(() => { if (!cancelled) setManuscriptError('Manuscript preview unavailable'); })
      .finally(() => { if (!cancelled) setManuscriptLoading(false); });
    return () => { cancelled = true; };
  }, [isSample, result?.analysis_run_id]);

  if (!result) return null;

  const findings = result.inconsistencies.slice().sort((a, b) => a.pair_order - b.pair_order);
  const displayTitle = isSample ? 'Guided Reading Outcomes' : extractDisplayTitle(manuscriptText) || result.doc_url.replace(/\.(docx|pdf|doc)$/i, '') || 'Document Coherence Scan';
  const sections = buildReportSections(result.sections_analyzed, manuscriptText);
  const activeSection = sections.find(section => section.key === activeSectionKey);
  const activePair = result.manuscript_flow.find(pair => String(pair.order) === activePairKey);
  const dimensions = ([
    ['objectives_alignment', 'Objectives alignment', 'bg-amber-500'],
    ['methodology_fit', 'Methodology fit', 'bg-emerald-500'],
    ['numeric_consistency', 'Numeric consistency', 'bg-rose-500'],
    ['claim_support', 'Claim support', 'bg-blue-500'],
  ] as const).map(([key, label, color]) => ({ key, label, color, value: result.score_breakdown.dimensions[key] }));
  const recommendations = result.recommendations.map(rec => ({ id: rec.recommendation_id, section: rec.section_b, quote: rec.original_sentence, revision: rec.recommended_revision }));
  const citations: Citation[] = result.citations.map((citation, index) => ({
    id: `cit-${index}`, ref: citationText(citation.citation_raw_reference_text), url: citation.citation_primary_link || '',
    status: citationAccess(citation), title: citationText(citation.citation_crossref_title),
    authors: citationText(citation.citation_authors_parsed), year: citation.citation_year_parsed,
  }));
  const displayedCitations = citationFilter ? citations.filter(citation => citation.status === citationFilter) : citations;
  const citeCount = (status: Citation['status']) => citations.filter(citation => citation.status === status).length;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'inconsistencies', label: `Findings (${result.inconsistencies.length})` },
    { id: 'strong_coherence', label: `Coherence Pairs (${result.manuscript_flow.length})` },
    { id: 'citations', label: `Citations (${citations.length})` },
  ];
  const allExpanded = result.inconsistencies.length > 0 && result.inconsistencies.every(item => expandedIssueIds.has(item.inconsistency_id));

  function highlighted(text: string, section?: string): React.ReactNode[] {
    const quotes = result!.inconsistencies.filter(item => item.evidence_verified)
      .flatMap(item => item.evidence_quotes)
      .filter(quote => !section || quote.section === section)
      .map(quote => quote.text);
    const ranges = verifiedQuoteRanges(text, quotes);
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    ranges.forEach(({ start, end }, index) => {
      nodes.push(text.slice(cursor, start));
      nodes.push(<mark key={index} className="bg-rose-200 rounded px-0.5">{text.slice(start, end)}</mark>);
      cursor = end;
    });
    nodes.push(text.slice(cursor));
    return nodes;
  }

  async function handleFeedback(item: V7Inconsistency, helpful: boolean) {
    const id = item.inconsistency_id;
    if (feedbackMap[id] || feedbackPending[id]) return;
    if (isSample) { setFeedbackMap(previous => ({ ...previous, [id]: helpful ? 'up' : 'down' })); return; }
    setFeedbackPending(previous => ({ ...previous, [id]: true }));
    setFeedbackError(previous => ({ ...previous, [id]: '' }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues/${encodeURIComponent(id)}/feedback`, {
        method: 'POST', headers: await authHeaders({ 'Content-Type': 'application/json', 'X-User-Id': result!.user_id }),
        body: JSON.stringify({ helpful }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setFeedbackMap(previous => ({ ...previous, [id]: helpful ? 'up' : 'down' }));
    } catch (error) {
      console.error('Failed to submit issue feedback:', error);
      setFeedbackError(previous => ({ ...previous, [id]: 'Could not save feedback. Please try again.' }));
    } finally { setFeedbackPending(previous => ({ ...previous, [id]: false })); }
  }

  function renderFeedback(item: V7Inconsistency) {
    const id = item.inconsistency_id;
    return <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap" aria-live="polite">
      <span className="text-xs text-gray-500">{feedbackMap[id] ? 'Thanks — feedback recorded.' : feedbackError[id] || 'Was this finding helpful?'}</span>
      <div className="flex gap-2">{([['up', 'Helpful', true], ['down', 'Not helpful', false]] as const).map(([kind, label, helpful]) =>
        <button key={kind} type="button" disabled={!!feedbackMap[id] || !!feedbackPending[id]} aria-pressed={feedbackMap[id] === kind}
          onClick={() => handleFeedback(item, helpful)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 hover:bg-gray-50 disabled:opacity-50">{label}</button>)}</div>
    </div>;
  }

  function renderCitation(citation: Citation) {
    return <div className="flex-1 min-w-0 citation-text text-[13px] text-gray-800 leading-relaxed">
      {citation.title && !citationContains(citation.ref, citation.title) && <p className="font-bold">{citation.title}</p>}
      {citation.authors && !citationContains(citation.ref, citation.authors) && <p>{citation.authors}</p>}
      {citation.year && !citationContains(citation.ref, citation.year) && <p>{citation.year}</p>}
      <p>{citation.ref}</p>
      {/^https?:\/\//i.test(citation.url) && <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline">{citation.url}</a>}
    </div>;
  }

  return <div className="h-screen h-dvh flex flex-col overflow-hidden bg-gray-50 print:h-auto print:overflow-visible font-sans">
    <ResultsHeader onNavigate={onNavigate} onBack={onBack} isSample={isSample} displayTitle={displayTitle} setShowPairingModal={setShowPairingModal} />
    <div className="hidden print:block p-8 bg-white space-y-4">
      <h1 className="text-2xl font-bold">ReSync Manuscript Coherence Report</h1>
      <p>{displayTitle} · {result.overall_coherence_score}/100 · {result.score_breakdown.band}</p>
      <h2 className="font-bold">Summary</h2><p>{result.ai_synthesis.summary || 'Summary unavailable for this scan'}</p>
      <h2 className="font-bold">Findings</h2>
      {findings.map(item => <section key={item.inconsistency_id}><h3 className="font-semibold">{item.section_a} → {item.section_b}</h3><p>{item.explanation_what}</p><p>{item.explanation_why}</p><p>{item.suggested_fix}</p></section>)}
      <h2 className="font-bold">Recommendations</h2>
      {result.recommendations.map(item => <p key={item.recommendation_id}>{item.original_sentence || 'Verified source sentence unavailable'} → {item.recommended_revision}</p>)}
      <h2 className="font-bold">Citations</h2>
      {citations.map(citation => <p key={citation.id}>{citation.ref} {citation.url}</p>)}
    </div>
    <main className="flex-1 flex overflow-hidden print:block print:overflow-visible">
      <div className={`${mobilePane === 'report' ? 'flex' : 'hidden'} lg:flex flex-1 min-w-0 overflow-y-auto bg-white flex-col print:flex print:overflow-visible`}>
        <div className="sticky top-0 z-20 px-6 py-3 bg-white border-b border-gray-100 text-xs font-semibold text-gray-500 print:hidden">Manuscript preview</div>
        <div className="w-full max-w-5xl mx-auto px-6 lg:px-10 py-10">
          <header className="mb-7"><p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 mb-5">{isSample ? 'Sample manuscript report' : 'Manuscript report'}</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>{displayTitle}</h1>
            <p className="text-xs text-gray-500 mt-4">Overall assessment <strong>{result.score_breakdown.band}</strong> · {result.inconsistencies.length} findings across {result.sections_analyzed.length} sections</p>
          </header>
          {manuscriptLoading && <p className="text-sm text-gray-600">Loading manuscript text…</p>}
          {manuscriptText ? <article className="whitespace-pre-wrap break-words font-serif text-sm sm:text-base leading-8 text-gray-800">{highlighted(manuscriptText)}</article>
            : !manuscriptLoading && <div className="space-y-4"><p role={manuscriptError ? 'alert' : undefined} className="text-sm text-gray-600">{manuscriptError || 'Manuscript preview unavailable'} · Showing verified evidence excerpts.</p>
              {result.inconsistencies.filter(item => item.evidence_verified).flatMap(item => item.evidence_quotes).map((quote, index) => <section key={index} className="border-t border-gray-100 pt-4"><h2 className="font-bold text-gray-900">{quote.section}</h2><p className="text-sm text-gray-700">{highlighted(quote.text, quote.section)}</p></section>)}
            </div>}
        </div>
      </div>
      <div className={`${mobilePane === 'xai' ? 'flex w-full' : 'hidden'} lg:flex shrink-0 bg-white flex-col overflow-hidden lg:w-[360px] xl:w-[420px] 2xl:w-[460px] border-l border-gray-100 print:flex print:w-full print:overflow-visible`}>
        <div className="flex-1 overflow-y-auto print:overflow-visible">
          <ResultsScorePanel score={result.overall_coherence_score} displayBand={result.score_breakdown.band} advisoryDimensions={dimensions} />
          <CoherenceAnalysis analysisExpanded={analysisExpanded} setAnalysisExpanded={setAnalysisExpanded} analysisTab={analysisTab} setAnalysisTab={setAnalysisTab}
            recommendations={recommendations} synthesis={result.ai_synthesis.summary}
            strongestAlignment={result.ai_synthesis.strongest_pair ? { title: `${result.ai_synthesis.strongest_pair.section_a} → ${result.ai_synthesis.strongest_pair.section_b} · ${result.ai_synthesis.strongest_pair.score}/100` } : undefined}
            needsAttention={result.ai_synthesis.weakest_pair ? { title: `${result.ai_synthesis.weakest_pair.section_a} → ${result.ai_synthesis.weakest_pair.section_b} · ${result.ai_synthesis.weakest_pair.score}/100` } : undefined}>
            <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-3 print:hidden" role="tablist" aria-label="Results tabs">
              {tabs.map((tab, index) => <button key={tab.id} type="button" role="tab" id={`results-tab-${tab.id}`} aria-selected={activeTab === tab.id} aria-controls="results-tab-panel" tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)} onKeyDown={event => {
                  const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
                  if (next < 0) return;
                  event.preventDefault();
                  setActiveTab(tabs[next].id);
                  document.getElementById(`results-tab-${tabs[next].id}`)?.focus();
                }} className={`px-3 py-3 text-xs font-bold border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>{tab.label}</button>)}
            </div>
            <div id="results-tab-panel" role="tabpanel" aria-labelledby={`results-tab-${activeTab}`} tabIndex={0} className="px-4 py-5">
              {activeTab === 'overview' && <OverviewTab reportSections={sections} setActiveSectionRole={key => { setActiveSectionKey(key); setActivePairKey(null); }} />}
              {activeTab === 'inconsistencies' && <FindingsTab findings={findings} expandedIssueIds={expandedIssueIds}
                toggleIssueExpanded={id => setExpandedIssueIds(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
                allExpanded={allExpanded} toggleAllExpanded={() => setExpandedIssueIds(allExpanded ? new Set() : new Set(result.inconsistencies.map(item => item.inconsistency_id)))} renderFeedback={renderFeedback} />}
              {activeTab === 'strong_coherence' && <CoherencePairsTab pairs={result.manuscript_flow} activePairKey={activePairKey} onExplain={() => setShowPairingModal(true)}
                onSelect={order => { setActivePairKey(current => current === order ? null : order); setActiveSectionKey(null); if (!window.matchMedia('(min-width: 1024px)').matches) setMobilePane('xai'); }} />}
              {activeTab === 'citations' && <CitationsTab citationFilter={citationFilter} setCitationFilter={setCitationFilter} displayedCitations={displayedCitations}
                citationsCount={citations.length} citeCount={citeCount} renderCitation={renderCitation} scan={result} />}
            </div>
          </CoherenceAnalysis>
          {activeSection && <div className="p-6 space-y-4"><button type="button" onClick={() => setActiveSectionKey(null)} className="text-xs text-indigo-600">Close section</button>
            <h2 className="font-bold text-gray-900">{activeSection.name}</h2>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{activeSection.text ? highlighted(activeSection.text, activeSection.name) : 'Section text unavailable in this preview.'}</p>
          </div>}
          {activePair && <div className="p-6 space-y-4"><button type="button" onClick={() => setActivePairKey(null)} className="text-xs text-indigo-600">Close pair</button>
            <h2 className="font-bold text-gray-900">{activePair.section_a} → {activePair.section_b}</h2><PairScores pair={activePair} />
          </div>}
          {result.ai_text_indicator && <div className="p-5 border-t border-gray-100 text-xs text-gray-600">AI-text indicator: {result.ai_text_indicator.overall_score ?? '—'} · {result.ai_text_indicator.disclaimer}</div>}
        </div>
      </div>
    </main>
    <nav className="lg:hidden shrink-0 grid grid-cols-2 border-t border-gray-200 bg-white print:hidden" aria-label="Mobile report panes">
      <button type="button" onClick={() => setMobilePane('report')} className={`py-3 text-xs font-bold ${mobilePane === 'report' ? 'text-indigo-600' : 'text-gray-500'}`}>Manuscript</button>
      <button type="button" onClick={() => setMobilePane('xai')} className={`py-3 text-xs font-bold ${mobilePane === 'xai' ? 'text-indigo-600' : 'text-gray-500'}`}>Analysis</button>
    </nav>
    {showPairingModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPairingModal(false)}>
      <div role="dialog" aria-modal="true" aria-label="How section pairing works" className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4" onClick={event => event.stopPropagation()}>
        <h2 className="font-bold text-gray-900">How Section Pairing Works</h2>
        <p className="text-sm text-gray-700">ReSync compares each section with its next section in manuscript order. Skipped pairs remain listed with their reason. Scored pairs contribute according to their pair weight.</p>
        <button type="button" onClick={() => setShowPairingModal(false)} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold">Close</button>
      </div>
    </div>}
  </div>;
}
