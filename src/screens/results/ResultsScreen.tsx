import { useEffect, useState } from 'react';
import type React from 'react';
import type { Screen } from '../../lib/appTypes';
import type { V7ScanResponse } from '../../services/v7Result';
import { fetchManuscript, getCreditBalance, getScanResult, unlockScan } from '../../services/api';
import { SAMPLE_MANUSCRIPT, SAMPLE_REPORT, type Citation } from '../../data/sampleReport';
import { ResultsHeader } from './ResultsHeader';
import { ResultsScorePanel } from './ResultsScorePanel';
import { CitationsTab } from './CitationsTab';
import { ManuscriptSections, ManuscriptViewer } from './ManuscriptViewer';
import { citationAccess, citationContains, citationText, extractDisplayTitle, normalizeManuscriptPreview, plainText } from './helpers';
import { matchedRecommendations, recommendationRanges, verifiedQuoteRanges } from './highlights';
import { ResultsCheckout } from './ResultsCheckout';
import { recommendationCategory, type RecommendationCategory } from './categoryColors';
import { RecommendationsList } from './RecommendationsList';

type Tab = 'recommendations' | 'citations';

export function ResultsScreen({ onNavigate, onBack, scan, isSample }: { onNavigate: (screen: Screen) => void; onBack: () => void; scan?: V7ScanResponse | null; isSample?: boolean }) {
  const [currentScan, setCurrentScan] = useState(scan);
  const result = isSample ? SAMPLE_REPORT : currentScan;
  const isGoogleDoc = /^https?:\/\/docs\.google\.com\//i.test(result?.doc_url ?? '');
  const locked = !isSample && result?.access?.unlocked === false;
  const [balance, setBalance] = useState<number | null>(null);
  const [buyCredits, setBuyCredits] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [unlockedToast, setUnlockedToast] = useState(false);
  useEffect(() => setCurrentScan(scan), [scan]);
  useEffect(() => {
    if (!locked || !result?.user_id) return;
    getCreditBalance(result.user_id).then(value => setBalance(value.balance)).catch(() => setBalance(null));
  }, [locked, result?.user_id]);
  const [manuscriptText, setManuscriptText] = useState<string | null>(isSample ? SAMPLE_MANUSCRIPT : null);
  const [manuscriptLoading, setManuscriptLoading] = useState(!isSample && isGoogleDoc);
  const [manuscriptReason, setManuscriptReason] = useState<string>();
  const [activeTab, setActiveTab] = useState<Tab>('recommendations');
  const [revealId, setRevealId] = useState<string | null>(null);
  const [citationFilter, setCitationFilter] = useState<Citation['status'] | null>(null);

  useEffect(() => {
    if (!isGoogleDoc) { setManuscriptText(null); setManuscriptLoading(false); return; }
    if (isSample || result?.manuscript_sections || !result?.analysis_run_id) return;
    let cancelled = false;
    setManuscriptLoading(true);
    setManuscriptText(null);
    setManuscriptReason(undefined);
    fetchManuscript(result.analysis_run_id).then(response => {
      if (cancelled) return;
      setManuscriptText(response.available && response.text ? normalizeManuscriptPreview(response.text) : null);
      setManuscriptReason(response.reason);
    }).catch(() => { if (!cancelled) setManuscriptText(null); })
      .finally(() => { if (!cancelled) setManuscriptLoading(false); });
    return () => { cancelled = true; };
  }, [isSample, isGoogleDoc, result?.analysis_run_id, result?.manuscript_sections]);

  if (!result) return null;

  async function handleUnlock() {
    if (!result || unlocking) return;
    if (balance === 0) { setBuyCredits(true); return; }
    setUnlocking(true);
    setUnlockError('');
    try {
      const response = await unlockScan(result.analysis_run_id);
      setBalance(response.credits_remaining);
      const full = await getScanResult(result.analysis_run_id);
      if (full.result_version !== 'v7') throw new Error('The full report is not ready. Refresh and try again.');
      setCurrentScan(full as V7ScanResponse);
      setUnlockedToast(true);
      window.setTimeout(() => setUnlockedToast(false), 4000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unlock failed. Try again.';
      setUnlockError(message);
      if (/not enough credits/i.test(message)) setBalance(0);
    } finally { setUnlocking(false); }
  }

  const unlockControl = <div className="space-y-2">
    <button type="button" onClick={handleUnlock} disabled={unlocking} className="w-full rounded-xl bg-[#1a1fcc] px-4 py-3 text-sm font-bold text-white hover:bg-[#1115a5] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1fcc]">
      {unlocking ? 'Unlocking…' : balance === 0 ? 'Buy credits' : 'Unlock full report (1 credit)'}
    </button>
    <p className="text-center text-xs text-[#4b5563]">{balance == null ? 'Checking credit balance' : `You have ${balance} ${balance === 1 ? 'credit' : 'credits'}`}</p>
    {unlockError && <p role="alert" className="text-sm text-[#9f1239]">{unlockError} {balance === 0 ? 'Buy credits to continue.' : 'Try again.'}</p>}
  </div>;

  const suppliedTitle = result.manuscript_title?.trim();
  const loadedTitle = extractDisplayTitle(manuscriptText);
  const displayTitle = isSample ? 'Guided Reading Outcomes' : (suppliedTitle && !/^https?:\/\/docs\.google\.com\//i.test(suppliedTitle) ? suppliedTitle : null)
    || (loadedTitle && !/^https?:\/\/docs\.google\.com\//i.test(loadedTitle) ? loadedTitle : null)
    || (isGoogleDoc ? 'Google Docs manuscript' : result.doc_url.split(/[\\/]/).pop()?.replace(/\.(docx|pdf|doc)$/i, '')) || 'Document Coherence Scan';
  const displayBand = result.score_breakdown.band.toLowerCase().replace(/^./, letter => letter.toUpperCase());
  const recommendations = result.recommendations.slice(0, locked ? 2 : undefined).map(rec => ({ id: rec.id ?? rec.recommendation_id, section: rec.section ?? rec.section_b, quote: rec.original_sentence, issue: rec.issue, pair: rec.pair_order, pairLabel: `${rec.section_a} → ${rec.section_b}`, revision: rec.recommended_revision, category: recommendationCategory((rec as typeof rec & { category?: RecommendationCategory }).category) }));
  const matched = matchedRecommendations(result.manuscript_sections ?? [], result.recommendations);
  const linkedIds = new Set<string>(result.manuscript_sections?.flatMap(section => recommendationRanges(section, matched).map(range => range.id)));

  function focusLinked(kind: 'recommendation' | 'highlight', id: string) {
    if (kind === 'recommendation') { setActiveTab('recommendations'); setRevealId(id); }
    requestAnimationFrame(() => {
      const target = document.getElementById(`${kind}-${id}`);
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
      const scroller = target?.closest<HTMLElement>('.results-scroll');
      if (target && scroller && window.matchMedia('(min-width: 1024px)').matches) {
        scroller.scrollTo({ top: scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - (scroller.clientHeight - target.clientHeight) / 2, behavior });
      } else target?.scrollIntoView({ block: 'center', behavior });
      target?.focus({ preventScroll: true });
      target?.classList.add('result-focus');
      window.setTimeout(() => target?.classList.remove('result-focus'), 1600);
    });
  }
  const citations: Citation[] = result.citations.map((citation, index) => ({
    id: `cit-${index}`, ref: citationText(citation.citation_raw_reference_text), url: citation.citation_primary_link || '',
    status: citationAccess(citation), title: citationText(citation.citation_crossref_title),
    authors: citationText(citation.citation_authors_parsed), year: citation.citation_year_parsed,
  }));
  const displayedCitations = citationFilter ? citations.filter(citation => citation.status === citationFilter) : citations;
  const citeCount = (status: Citation['status']) => citations.filter(citation => citation.status === status).length;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'recommendations', label: `Recommendations (${recommendations.length + (locked ? result.access!.locked_counts.recommendations : 0)})` },
    { id: 'citations', label: `Citations (${citations.length + (locked ? result.access!.locked_counts.citations : 0)})` },
  ];

  function highlighted(text: string): React.ReactNode[] {
    const quotes = result!.inconsistencies.filter(item => item.evidence_verified)
      .flatMap(item => item.evidence_quotes)
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

  function renderCitation(citation: Citation) {
    return <div className="flex-1 min-w-0 citation-text text-[13px] text-gray-800 leading-relaxed">
      {citation.title && !citationContains(citation.ref, citation.title) && <p className="font-bold">{citation.title}</p>}
      {citation.authors && !citationContains(citation.ref, citation.authors) && <p>{citation.authors}</p>}
      {citation.year && !citationContains(citation.ref, citation.year) && <p>{citation.year}</p>}
      <p>{citation.ref}</p>
      {/^https?:\/\//i.test(citation.url) && <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline">{citation.url}</a>}
    </div>;
  }

  return <div className="results-screen min-h-screen bg-[#f6f7fb] font-sans text-[#0b0f3d] lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white">
    <ResultsHeader onNavigate={onNavigate} onBack={onBack} isSample={isSample} displayTitle={displayTitle} />
    {unlockedToast && <div role="status" className="fixed top-16 right-4 z-50 rounded-xl bg-[#0b0f3d] px-5 py-3 text-sm font-semibold text-white shadow-lg print:hidden">Full report unlocked</div>}
    {buyCredits && <ResultsCheckout userId={result.user_id} balance={balance} onBalance={setBalance} onClose={() => setBuyCredits(false)} />}
    <div className="hidden print:block p-8 bg-white space-y-4">
      <h1 className="text-2xl font-bold">ReSync Manuscript Coherence Report</h1>
      <p>{displayTitle}. {Math.round(result.overall_coherence_score)} out of 100. {displayBand}.</p>
      <ResultsScorePanel result={result} />
      <h2 className="font-bold">Recommendations</h2>
      {result.recommendations.map(item => <p key={item.recommendation_id}>{item.original_sentence && `${plainText(item.original_sentence)} → `}{plainText(item.recommended_revision)}</p>)}
      <h2 className="font-bold">Citations</h2>
      {citations.map(citation => <p key={citation.id}>{citation.ref} {citation.url}</p>)}
    </div>
    <header className="mx-auto w-full max-w-[1480px] px-4 pt-8 pb-5 sm:px-6 lg:max-w-none lg:shrink-0 lg:px-5">
      <h1 className="max-w-4xl text-[28px] font-semibold leading-tight text-[#0b0f3d] sm:text-4xl" style={{ fontFamily: 'Source Serif 4, Georgia, serif' }}>{displayTitle}</h1>
      <p className="mt-3 text-sm text-[#4b5563]">{displayBand}, {result.inconsistencies.length} findings across {result.sections_analyzed.length} sections</p>
    </header>
    <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-4 pb-12 sm:px-6 lg:min-h-0 lg:max-w-none lg:flex-1 lg:flex-row lg:items-stretch lg:gap-px lg:bg-[#dfe5f5] lg:px-0 lg:pb-0 print:block print:h-auto print:overflow-visible">
      <div tabIndex={0} aria-label="Manuscript" className="results-scroll order-2 min-w-0 flex-1 rounded-2xl bg-white shadow-[0_10px_35px_#0b0f3d08] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1a1fcc] lg:order-1 lg:rounded-none lg:shadow-none lg:overflow-y-auto print:overflow-visible print:shadow-none">
        <div className="mx-auto w-full max-w-[78ch] px-5 py-7 sm:px-10 sm:py-10 lg:px-12">
          {result.manuscript_sections ? <ManuscriptSections result={result} onHighlight={id => focusLinked('recommendation', id)} locked={locked} unlockControl={unlockControl} revealed={unlockedToast} /> : manuscriptLoading && result.analysis_run_id ? <p className="text-sm text-gray-600">Loading manuscript text…</p> : (manuscriptText
            ? <article className="whitespace-pre-wrap break-words font-serif text-sm sm:text-base leading-8 text-gray-800">{highlighted(manuscriptText)}</article>
            : isGoogleDoc ? <ManuscriptViewer result={result} reason={manuscriptReason} />
            : <div className="mx-auto flex max-w-[420px] flex-col items-center py-8 text-center"><ResultsScorePanel result={result} large /><p className="mt-5 text-sm leading-6 text-[#4b5563]">This report was created before manuscripts were stored, so the text can't be shown. Re-scan to see your manuscript with highlights.</p></div>)}
        </div>
      </div>
      <aside tabIndex={0} aria-label="Analysis panel" className="results-scroll order-1 w-full min-w-0 shrink-0 rounded-2xl bg-white shadow-[0_10px_35px_#0b0f3d08] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1a1fcc] lg:order-2 lg:w-[clamp(380px,28vw,520px)] lg:rounded-none lg:shadow-none lg:overflow-y-auto print:hidden">
        <div>
          <ResultsScorePanel result={result} />
            <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-3 print:hidden" role="tablist" aria-label="Results tabs">
              {tabs.map((tab, index) => <button key={tab.id} type="button" role="tab" id={`results-tab-${tab.id}`} aria-selected={activeTab === tab.id} aria-controls="results-tab-panel" tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)} onKeyDown={event => {
                  const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
                  if (next < 0) return;
                  event.preventDefault();
                  setActiveTab(tabs[next].id);
                  document.getElementById(`results-tab-${tabs[next].id}`)?.focus();
                }} className={`px-3 py-3 text-xs font-bold border-b-2 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1a1fcc] ${activeTab === tab.id ? 'border-[#1a1fcc] text-[#1a1fcc]' : 'border-transparent text-[#4b5563]'}`}>{tab.label}</button>)}
            </div>
            <div id="results-tab-panel" role="tabpanel" aria-labelledby={`results-tab-${activeTab}`} tabIndex={0} className="px-4 py-5">
              {activeTab === 'recommendations' && <div className="space-y-4">
                <RecommendationsList items={recommendations} pairs={result.manuscript_flow} linkedIds={linkedIds} onShowInManuscript={id => focusLinked('highlight', id)} revealId={revealId} />
                {locked && <div className="rounded-xl border border-[#dfe5f5] bg-[#e9edf8] p-4 text-sm text-[#0b0f3d]"><p className="mb-3 font-semibold">{result.access!.locked_counts.recommendations} more {result.access!.locked_counts.recommendations === 1 ? 'recommendation' : 'recommendations'} in the full report</p>{unlockControl}</div>}
              </div>}
              {activeTab === 'citations' && (locked ? <div className="rounded-xl border border-[#dfe5f5] bg-[#e9edf8] p-4 text-sm text-[#0b0f3d]"><p className="mb-3 font-semibold">{result.access!.locked_counts.citations} {result.access!.locked_counts.citations === 1 ? 'citation' : 'citations'} checked in the full report</p>{unlockControl}</div> : <CitationsTab citationFilter={citationFilter} setCitationFilter={setCitationFilter} displayedCitations={displayedCitations}
                citationsCount={citations.length} citeCount={citeCount} renderCitation={renderCitation} scan={result} />)}
            </div>
          {result.ai_text_indicator && <div className="p-5 border-t border-gray-100 text-xs text-gray-600">AI-text indicator: {result.ai_text_indicator.overall_score ?? '—'}. A rough hint only, not proof that AI wrote the text. Well-written academic prose can score 40-60 on its own. Never use it alone to judge a submission.
            <details className="mt-2"><summary className="cursor-pointer font-semibold text-indigo-700">More about this indicator</summary><p className="mt-2">{plainText(result.ai_text_indicator.disclaimer)}</p></details>
          </div>}
        </div>
      </aside>
    </main>
  </div>;
}
