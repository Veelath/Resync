import { useEffect, useState } from 'react';
import type React from 'react';
import type { Screen } from '../../lib/appTypes';
import type { V7ScanResponse } from '../../services/v7Result';
import { fetchManuscript } from '../../services/api';
import { SAMPLE_MANUSCRIPT, SAMPLE_REPORT, type Citation } from '../../data/sampleReport';
import { ResultsHeader } from './ResultsHeader';
import { ResultsScorePanel } from './ResultsScorePanel';
import { CitationsTab } from './CitationsTab';
import { ManuscriptSections, ManuscriptViewer, PreviewLegend } from './ManuscriptViewer';
import { citationAccess, citationContains, citationText, extractDisplayTitle, normalizeManuscriptPreview, plainText } from './helpers';
import { verifiedQuoteRanges } from './highlights';

type Tab = 'recommendations' | 'citations';

export function ResultsScreen({ onNavigate, onBack, scan, isSample }: { onNavigate: (screen: Screen) => void; onBack: () => void; scan?: V7ScanResponse | null; isSample?: boolean }) {
  const result = isSample ? SAMPLE_REPORT : scan;
  const [manuscriptText, setManuscriptText] = useState<string | null>(isSample ? SAMPLE_MANUSCRIPT : null);
  const [manuscriptLoading, setManuscriptLoading] = useState(!isSample);
  const [manuscriptReason, setManuscriptReason] = useState<string>();
  const [activeTab, setActiveTab] = useState<Tab>('recommendations');
  const [mobilePane, setMobilePane] = useState<'report' | 'xai'>('report');
  const [citationFilter, setCitationFilter] = useState<Citation['status'] | null>(null);

  useEffect(() => {
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
  }, [isSample, result?.analysis_run_id]);

  if (!result) return null;

  const isGoogleDoc = /^https?:\/\/docs\.google\.com\//i.test(result.doc_url);
  const suppliedTitle = result.manuscript_title?.trim();
  const loadedTitle = extractDisplayTitle(manuscriptText);
  const displayTitle = isSample ? 'Guided Reading Outcomes' : (suppliedTitle && !/^https?:\/\/docs\.google\.com\//i.test(suppliedTitle) ? suppliedTitle : null)
    || (loadedTitle && !/^https?:\/\/docs\.google\.com\//i.test(loadedTitle) ? loadedTitle : null)
    || (isGoogleDoc ? 'Google Docs manuscript' : result.doc_url.split(/[\\/]/).pop()?.replace(/\.(docx|pdf|doc)$/i, '')) || 'Document Coherence Scan';
  const recommendations = result.recommendations.map(rec => ({ id: rec.id ?? rec.recommendation_id, section: rec.section ?? rec.section_b, quote: rec.original_sentence, revision: rec.recommended_revision }));

  function focusLinked(kind: 'recommendation' | 'highlight', id: string) {
    if (kind === 'recommendation') { setActiveTab('recommendations'); setMobilePane('xai'); }
    else setMobilePane('report');
    requestAnimationFrame(() => {
      const target = document.getElementById(`${kind}-${id}`);
      target?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
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
    { id: 'recommendations', label: `Recommendations (${recommendations.length})` },
    { id: 'citations', label: `Citations (${citations.length})` },
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

  return <div className="h-screen h-dvh flex flex-col overflow-hidden bg-gray-50 print:h-auto print:overflow-visible font-sans">
    <ResultsHeader onNavigate={onNavigate} onBack={onBack} isSample={isSample} displayTitle={displayTitle} />
    <div className="hidden print:block p-8 bg-white space-y-4">
      <h1 className="text-2xl font-bold">ReSync Manuscript Coherence Report</h1>
      <p>{displayTitle} · {Math.round(result.overall_coherence_score)}/100 · {result.score_breakdown.band}</p>
      <ResultsScorePanel result={result} />
      <h2 className="font-bold">Recommendations</h2>
      {result.recommendations.map(item => <p key={item.recommendation_id}>{item.original_sentence && `${plainText(item.original_sentence)} → `}{plainText(item.recommended_revision)}</p>)}
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
          <div className="mb-6"><PreviewLegend /></div>
          {result.manuscript_sections ? <ManuscriptSections result={result} onHighlight={id => focusLinked('recommendation', id)} /> : manuscriptLoading ? <p className="text-sm text-gray-600">Loading manuscript text…</p> : (manuscriptText
            ? <article className="whitespace-pre-wrap break-words font-serif text-sm sm:text-base leading-8 text-gray-800">{highlighted(manuscriptText)}</article>
            : <ManuscriptViewer result={result} reason={manuscriptReason} />)}
        </div>
      </div>
      <div className={`${mobilePane === 'xai' ? 'flex w-full' : 'hidden'} lg:flex shrink-0 bg-white flex-col overflow-hidden lg:w-[360px] xl:w-[420px] 2xl:w-[460px] border-l border-gray-100 print:hidden`}>
        <div className="flex-1 overflow-y-auto print:overflow-visible">
          <ResultsScorePanel result={result} />
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
              {activeTab === 'recommendations' && <div className="space-y-4">
                {recommendations.length ? recommendations.map((recommendation, index) => <div key={recommendation.id} id={`recommendation-${recommendation.id}`} tabIndex={-1} className="flex items-start gap-3 scroll-mt-6 rounded-lg">
                  <span className="rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-bold px-2 py-1.5 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1 rounded-xl bg-gray-50 p-3 space-y-2">
                    {recommendation.section && <p className="text-xs font-semibold text-gray-600">{recommendation.section}</p>}
                    {recommendation.quote && <div className="rounded-lg bg-gray-100 p-3"><p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">Original sentence</p><p className="text-xs text-gray-700 leading-relaxed">“{plainText(recommendation.quote)}”</p></div>}
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3"><p className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 mb-1">Recommended revision</p><p className="text-xs text-gray-700 leading-relaxed">{plainText(recommendation.revision)}</p></div>
                    {result.manuscript_sections && recommendation.quote && <button type="button" onClick={() => focusLinked('highlight', recommendation.id)} className="text-sm font-semibold text-[#1a1fcc] underline focus-visible:outline-2 focus-visible:outline-offset-2">Show in manuscript</button>}
                  </div>
                </div>) : <p className="text-sm text-gray-500">No recommendations for this scan.</p>}
              </div>}
              {activeTab === 'citations' && <CitationsTab citationFilter={citationFilter} setCitationFilter={setCitationFilter} displayedCitations={displayedCitations}
                citationsCount={citations.length} citeCount={citeCount} renderCitation={renderCitation} scan={result} />}
            </div>
          {result.ai_text_indicator && <div className="p-5 border-t border-gray-100 text-xs text-gray-600">AI-text indicator: {result.ai_text_indicator.overall_score ?? '—'} · A rough hint only, not proof that AI wrote the text. Well-written academic prose can score 40-60 on its own. Never use it alone to judge a submission.
            <details className="mt-2"><summary className="cursor-pointer font-semibold text-indigo-700">More about this indicator</summary><p className="mt-2">{plainText(result.ai_text_indicator.disclaimer)}</p></details>
          </div>}
        </div>
      </div>
    </main>
    <nav className="lg:hidden shrink-0 grid grid-cols-2 border-t border-gray-200 bg-white print:hidden" aria-label="Mobile report panes">
      <button type="button" onClick={() => setMobilePane('report')} className={`py-3 text-xs font-bold ${mobilePane === 'report' ? 'text-indigo-600' : 'text-gray-500'}`}>Manuscript</button>
      <button type="button" onClick={() => setMobilePane('xai')} className={`py-3 text-xs font-bold ${mobilePane === 'xai' ? 'text-indigo-600' : 'text-gray-500'}`}>Analysis</button>
    </nav>
  </div>;
}
