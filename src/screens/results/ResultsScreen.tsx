import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { Screen } from '../../lib/appTypes';
import type { V7ScanResponse } from '../../services/v7Result';
import { loadSourceFile, saveSourceFile } from '../../lib/sourceFile';
import type { HighlightSpec } from '../../lib/docxHighlight';
import { reviewUnfinished } from './reviewComplete';
import { shouldRetryWordView } from './wordViewRetry';
import { DocxPreview } from '../../components/DocxPreview';
import { DocxManuscript, type DocxManuscriptHandle } from './DocxManuscript';
import { downloadGoogleDoc, fetchManuscript, getCreditBalance, getScanResult, unlockScan } from '../../services/api';
import { SAMPLE_MANUSCRIPT, SAMPLE_REPORT, type Citation } from '../../data/sampleReport';
import { ResultsHeader } from './ResultsHeader';
import { BackToTop } from '../../components/AppPrimitives';
import { ResultsScorePanel } from './ResultsScorePanel';
import { ReportPrint } from './ReportPrint';
import { CitationsTab } from './CitationsTab';
import { ManuscriptSections, ManuscriptViewer } from './ManuscriptViewer';
import { citationAccess, citationHasNoLink, citationLinkRange, citationContains, citationText, extractDisplayTitle, normalizeManuscriptPreview, plainText, usableTitle } from './helpers';
import { clearPlacementMarker, edgeSentence, markInDocx, markInSection, type Placement } from '../../lib/placement';
import { matchedRecommendations, recommendationRanges, verifiedQuoteRanges } from './highlights';
import { ResultsCheckout } from './ResultsCheckout';
import { recommendationCategory, type RecommendationCategory } from './categoryColors';
import { RecommendationsList, inconsistencyTone, isRateLimited, severityTones } from './RecommendationsList';

import './report-design.css';

type Tab = 'recommendations' | 'clear' | 'citations';

export function ResultsScreen({ onNavigate, onBack, scan, isSample, sourceFile, onScanUpdated }: { onNavigate: (screen: Screen) => void; onBack: () => void; scan?: V7ScanResponse | null; isSample?: boolean; sourceFile?: File | null; onScanUpdated?: (scan: V7ScanResponse) => void }) {
  const [currentScan, setCurrentScan] = useState(scan);
  const manuscriptScroll = useRef<HTMLDivElement>(null);
  const docxView = useRef<DocxManuscriptHandle>(null);
  const result = isSample ? SAMPLE_REPORT : currentScan;
  const isGoogleDoc = /^https?:\/\/docs\.google\.com\//i.test(result?.doc_url ?? '');
  const locked = !isSample && result?.access?.unlocked === false;
  const [balance, setBalance] = useState<number | null>(null);
  const [buyCredits, setBuyCredits] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const unlockPending = useRef(false);
  const unlockedId = useRef<string | null>(null);
  const [unlockError, setUnlockError] = useState('');
  const [unlockedToast, setUnlockedToast] = useState(false);
  const [placementMessage, setPlacementMessage] = useState('');
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
  // The finding that is open in the side panel (its pair's order), or null when the whole list shows.
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [citationFilter, setCitationFilter] = useState<Citation['status'] | null>(null);
  // The student's own Word file, shown as written. It comes straight from the upload, or from this browser's storage
  // when a saved report is reopened; Google Docs links, old .doc files and sample reports use the text view instead.
  const [storedFile, setStoredFile] = useState<File | null>(null);
  const [sourceLoading, setSourceLoading] = useState(!sourceFile && !isSample);
  const [docxFailed, setDocxFailed] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const previousLocked = useRef(locked);
  useEffect(() => {
    if (shouldRetryWordView(previousLocked.current, locked)) { setDocxFailed(false); setPreviewFailed(false); }
    previousLocked.current = locked;
  }, [locked]);
  // A report opened where its Word file was never saved (another browser, another address) can be pointed at the original file once.
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [docxLinked, setDocxLinked] = useState<Set<string> | null>(null);
  const scanId = result?.analysis_run_id;
  useEffect(() => {
    setDocxFailed(false);
    setPreviewFailed(false);
    setPickedFile(null);
    setDocxLinked(null);
    if (sourceFile || isSample || !scanId) { setStoredFile(null); setSourceLoading(false); return; }
    let cancelled = false;
    setSourceLoading(true);
    loadSourceFile(scanId).then(async file => {
      if (!cancelled && !file && isGoogleDoc && result?.doc_url) {
        try { file = await downloadGoogleDoc(result.doc_url); if (!cancelled) void saveSourceFile(scanId, file); } catch { /* Keep the plain view. */ }
      }
      if (!cancelled) setStoredFile(file);
    }).finally(() => { if (!cancelled) setSourceLoading(false); });
    return () => { cancelled = true; };
  }, [scanId, sourceFile, isSample]);
  // The sample report is a real Word file too, so it looks exactly like a student's own report: pages, highlights and all.
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  useEffect(() => {
    if (!isSample) { setSampleFile(null); return; }
    let cancelled = false;
    fetch('/sample-manuscript.docx').then(response => response.ok ? response.blob() : Promise.reject(new Error('missing')))
      .then(blob => { if (!cancelled) setSampleFile(new File([blob], 'sample-manuscript.docx')); })
      .catch(() => { if (!cancelled) setSampleFile(null); });
    return () => { cancelled = true; };
  }, [isSample]);
  const sourceDocx = isSample ? sampleFile : [sourceFile, storedFile, pickedFile].find(file => file && /\.docx$/i.test(file.name)) ?? null;
  const docxFile = docxFailed ? null : sourceDocx;
  const fallbackFile = !locked && docxFailed && !previewFailed ? sourceDocx : null;

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

  const unfinished = locked && reviewUnfinished(result.ai_synthesis?.review_status);
  async function handleUnlock() {
    if (!result || !locked || unfinished || unlockPending.current) return;
    if (balance === 0 && unlockedId.current !== result.analysis_run_id) { setBuyCredits(true); return; }
    unlockPending.current = true;
    setUnlocking(true);
    setUnlockError('');
    try {
      if (unlockedId.current !== result.analysis_run_id) {
        const response = await unlockScan(result.analysis_run_id);
        unlockedId.current = result.analysis_run_id;
        setBalance(response.credits_remaining);
      }
      const full = await getScanResult(result.analysis_run_id);
      if (full.result_version !== 'v7') throw new Error('The full report is not ready. Refresh and try again.');
      setCurrentScan(full as V7ScanResponse);
      onScanUpdated?.(full as V7ScanResponse);
      setUnlockedToast(true);
      window.setTimeout(() => setUnlockedToast(false), 4000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unlock failed. Try again.';
      setUnlockError(message);
      if (/not enough credits/i.test(message)) setBalance(0);
    } finally { unlockPending.current = false; setUnlocking(false); }
  }

  const unlockControl = unfinished ? <div className="space-y-2"><p className="text-sm text-[#4b5563]">The AI review did not finish, so this score is provisional. Scan again to retry.</p><button type="button" onClick={() => onNavigate('upload')} className="w-full rounded-xl bg-[#1a1fcc] px-4 py-3 text-sm font-bold text-white">Scan again</button></div> : <div className="space-y-2">
    <button type="button" onClick={handleUnlock} disabled={unlocking} className="w-full rounded-xl bg-[#1a1fcc] px-4 py-3 text-sm font-bold text-white hover:bg-[#1115a5] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1fcc]">
      {unlocking ? 'Unlocking…' : balance === 0 ? 'Buy credits' : 'Unlock full report (1 credit)'}
    </button>
    <p className="text-center text-xs text-[#4b5563]">{balance == null ? 'Checking credit balance' : `You have ${balance} ${balance === 1 ? 'credit' : 'credits'}`}</p>
    {unlockError && <p role="alert" className="text-sm text-[#9f1239]">{unlockError} {balance === 0 ? 'Buy credits to continue.' : 'Try again.'}</p>}
  </div>;

  const displayTitle = isSample ? SAMPLE_REPORT.manuscript_title : usableTitle(result.manuscript_title)
    || usableTitle(extractDisplayTitle(manuscriptText))
    || (isGoogleDoc ? 'Google Docs manuscript' : result.doc_url.split(/[\\/]/).pop()?.replace(/\.(docx|pdf|doc)$/i, '')) || 'Document Coherence Scan';
  const recommendations = result.recommendations.slice(0, locked ? 2 : undefined).map(rec => ({ id: rec.id ?? rec.recommendation_id, section: rec.section ?? rec.section_b, quote: rec.original_sentence, issue: rec.issue, kind: rec.kind, placement: rec.placement, pair: rec.pair_order, pairLabel: `${rec.section_a} → ${rec.section_b}`, anchor: rec.kind === 'add' ? edgeSentence(result.manuscript_sections?.find(section => section.name === (rec.section ?? rec.section_b))?.text, rec.placement === 'start' ? 'start' : 'end') || undefined : undefined, revision: rec.recommended_revision, category: recommendationCategory((rec as typeof rec & { category?: RecommendationCategory }).category) }));
  // Pairs with a real issue (a severity above None); reports saved before severity existed count the pairs with advice.
  const hasAdvice = (order: number) => recommendations.some(rec => rec.pair === order);
  const issueCount = result.manuscript_flow.filter(pair => pair.severity !== undefined ? pair.severity !== null && (pair.severity !== 'None' || hasAdvice(pair.order)) : hasAdvice(pair.order)).length;
  // Pairs that need no action (no real issue found, or only a harmless wording difference) get their own tab, so the
  // Recommendations tab holds recommendations only. Pairs the AI could not review are never counted as clear.
  const clearCount = result.manuscript_flow.filter(pair => pair.scores.overall_coherence != null && (pair.severity !== undefined ? pair.severity === 'None' && !hasAdvice(pair.order) : false)).length;
  const lockedOrders = locked ? new Set<number>(recommendations.map(rec => rec.pair)) : undefined;
  const matched = matchedRecommendations(result.manuscript_sections ?? [], result.recommendations);
  const linkedIds = docxFile
    ? new Set<string>(recommendations.filter(rec => rec.kind !== 'add' && (locked ? docxLinked?.has(rec.id) : !!rec.quote)).map(rec => rec.id))
    : new Set<string>(result.manuscript_sections?.flatMap(section => recommendationRanges(section, matched).map(range => range.id)));
  // Colors follow the pair's grade, so a highlight in the paper matches the card that explains it.
  const rateLimited = isRateLimited(result.ai_synthesis?.review_status);
  const docxHighlights: HighlightSpec[] = docxFile ? [
    ...recommendations.flatMap(rec => {
      const pair = result.manuscript_flow.find(entry => entry.order === rec.pair);
      const tone = severityTones[(pair?.severity && pair.severity !== 'None' ? pair.severity : 'Moderate') as keyof typeof severityTones];
      const edge = rec.kind === 'add' ? edgeSentence(result.manuscript_sections?.find(section => section.name === rec.section)?.text, rec.placement === 'start' ? 'start' : 'end', 4000) : '';
      if (rec.kind === 'add' && edge) return [{ id: rec.id, text: edge, background: '#ffe8a3', border: '#e0a53c', title: 'Click to see the finding', onClick: (id: string) => focusLinked('recommendation', id) }];
      return rec.quote && rec.kind !== 'add' ? [{ id: rec.id, text: rec.quote, ...tone, title: 'Click to see why this was flagged', onClick: (id: string) => focusLinked('recommendation', id) }] : [];
    }),
    ...result.manuscript_flow.flatMap(pair => (pair.explanation?.highlighted_inconsistencies ?? []).filter(item => item.quote).map((item, index) => ({
      id: `issue-${pair.order}-${index}`, text: item.quote, ...inconsistencyTone, title: 'Part of an inconsistency between sections',
    }))),
  ] : [];

  function scrollToTarget(target: HTMLElement | null, flash = 1600) {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    const scroller = target?.closest<HTMLElement>('.results-scroll');
    if (target && scroller && window.matchMedia('(min-width: 1024px)').matches) {
      scroller.scrollTo({ top: scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - (scroller.clientHeight - target.clientHeight) / 2, behavior });
    } else target?.scrollIntoView({ block: 'center', behavior });
    target?.focus({ preventScroll: true });
    target?.classList.add('result-focus');
    window.setTimeout(() => target?.classList.remove('result-focus'), flash);
  }

  async function focusLinked(kind: 'recommendation' | 'highlight', id: string) {
    if (kind === 'highlight' && docxFile && !locked) {
      while (!document.getElementById(`highlight-${id}`) && await docxView.current?.loadNext()) { /* load until found */ }
      if (!document.getElementById(`highlight-${id}`)) {
        setPlacementMessage('We could not find that passage in the preview. You can still read the recommendation.');
        window.setTimeout(() => setPlacementMessage(''), 6000);
        return;
      }
    }
    if (kind === 'recommendation') {
      setActiveTab('recommendations'); setRevealId(id);
      const found = recommendations.find(item => item.id === id);
      if (found) setSelectedOrder(found.pair);
    }
    requestAnimationFrame(() => scrollToTarget(document.getElementById(`${kind}-${id}`)));
  }

  // The highlight of the open finding gets a ring, like the design.
  useEffect(() => {
    const ids = new Set(recommendations.filter(item => item.pair === selectedOrder).map(item => item.id));
    document.querySelectorAll<HTMLElement>('.docx-host mark[data-highlight-for]').forEach(mark => {
      if (selectedOrder != null && ids.has(mark.dataset.highlightFor ?? '')) mark.dataset.selected = 'true'; else delete mark.dataset.selected;
    });
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // Choosing a finding opens it and takes the reader to the matching spot in the paper.
  function selectFinding(order: number) {
    setActiveTab('recommendations');
    setSelectedOrder(order);
    const first = recommendations.find(item => item.pair === order);
    if (!first) return;
    if (linkedIds.has(first.id) && (docxFile || document.getElementById(`highlight-${first.id}`))) focusLinked('highlight', first.id);
    else if (first.kind === 'add' && first.section && first.placement) showPlacement(first.section, first.placement, plainText(first.revision));
    else {
      setPlacementMessage('We could not find that passage in the preview. You can still read the recommendation.');
      window.setTimeout(() => setPlacementMessage(''), 6000);
    }
  }

  // "Go to this spot": scrolls to where a new sentence belongs and leaves a visible note there until the next one.
  async function showPlacement(section: string, placement: Placement, sentence?: string) {
    if (docxFile && !locked) while (await docxView.current?.loadNext()) { /* find the complete section */ }
    const names = (result?.manuscript_sections ?? []).map(item => item.name);
    const index = names.findIndex(name => name.toLowerCase() === section.toLowerCase());
    const marker = index < 0 ? null : docxFile
      ? markInDocx(document.querySelector<HTMLElement>('.docx-host .docx-main') ?? document.body, names, index, placement, sentence)
      : markInSection(document.querySelector(`[data-section-index="${index}"]`), placement, sentence);
    if (marker) {
      setPlacementMessage('');
      scrollToTarget(marker, 2400);
      return;
    }
    clearPlacementMarker();
    setPlacementMessage(locked && index > 0
      ? 'That part of your paper is locked. Unlock the full report to see where this sentence goes.'
      : `We could not find the ${section} section in the page. Look for it by its heading and add the sentence there.`);
    window.setTimeout(() => setPlacementMessage(''), 6000);
  }
  const citations: Citation[] = result.citations.map((citation, index) => ({
    id: `cit-${index}`, ref: citationText(citation.citation_raw_reference_text), url: citation.citation_primary_link || '',
    status: citationAccess(citation), noLink: citationHasNoLink(citation), title: citationText(citation.citation_crossref_title),
    authors: citationText(citation.citation_authors_parsed), year: citation.citation_year_parsed,
  }));
  const displayedCitations = citationFilter ? citations.filter(citation => citation.status === citationFilter) : citations;
  const citeCount = (status: Citation['status']) => citations.filter(citation => citation.status === status).length;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'recommendations', label: `Recommendations (${issueCount})` },
    { id: 'clear', label: `All clear (${clearCount})` },
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
    const linkRange = citationLinkRange(citation.ref, citation.url);
    return <div className="flex-1 min-w-0 citation-text text-[13px] text-gray-800 leading-relaxed">
      {citation.title && !citationContains(citation.ref, citation.title) && <p className="font-bold">{citation.title}</p>}
      {citation.authors && !citationContains(citation.ref, citation.authors) && <p>{citation.authors}</p>}
      {citation.year && !citationContains(citation.ref, citation.year) && <p>{citation.year}</p>}
      <p>{linkRange ? <>{citation.ref.slice(0, linkRange[0])}<a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline break-all">{citation.ref.slice(...linkRange)}</a>{citation.ref.slice(linkRange[1])}</> : citation.ref}</p>
      {!linkRange && /^https?:\/\//i.test(citation.url) && <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline break-all">{citation.url}</a>}
    </div>;
  }

  return <div className="results-screen min-h-screen bg-[#f6f7fb] font-sans text-[#0b0f3d] lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white">
    <ResultsHeader onNavigate={onNavigate} onBack={onBack} isSample={isSample} displayTitle={displayTitle} />
    {placementMessage && <div role="status" className="fixed top-16 right-4 z-50 max-w-sm rounded-xl bg-[#0b0f3d] px-5 py-3 text-sm font-semibold text-white shadow-lg print:hidden">{placementMessage}</div>}
    {unlockedToast && <div role="status" className="fixed top-16 right-4 z-50 rounded-xl bg-[#0b0f3d] px-5 py-3 text-sm font-semibold text-white shadow-lg print:hidden">Full report unlocked</div>}
    {buyCredits && <ResultsCheckout userId={result.user_id} balance={balance} onBalance={setBalance} onClose={() => setBuyCredits(false)} />}
    <ReportPrint result={result} title={displayTitle} items={recommendations} citations={citations} locked={locked} lockedOrders={lockedOrders} />
    <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-4 pb-12 sm:px-6 lg:min-h-0 lg:max-w-none lg:flex-1 lg:flex-row lg:items-stretch lg:gap-px lg:bg-[#dfe5f5] lg:px-0 lg:pb-0 print:hidden">
      <div ref={manuscriptScroll} tabIndex={0} aria-label="Manuscript" className="results-scroll manuscript-scroll order-2 min-w-0 flex-1 rounded-2xl bg-white shadow-[0_10px_35px_#0b0f3d08] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1a1fcc] lg:order-1 lg:rounded-none lg:shadow-none lg:overflow-y-auto print:overflow-visible print:shadow-none">
        {!docxFile && !fallbackFile && !sourceLoading && !isSample && scanId && <div className="flex flex-wrap items-center justify-center gap-3 border-b border-[#e1dffa] bg-[#fff8e6] px-4 py-2.5 text-[13px] text-[#6b4e00] print:hidden">
          <span>{docxFailed && locked ? 'Showing the available manuscript text.' : docxFailed ? 'Your Word file could not be drawn here.' : 'This browser does not have your Word file, so the text is shown without its original layout.'}</span>
          {!(locked && docxFailed) && <label className="cursor-pointer rounded-full bg-[#1a1fcc] px-3.5 py-1.5 text-[12.5px] font-extrabold text-white focus-within:outline-2 focus-within:outline-offset-2">Show my Word file
            <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={event => {
              const file = event.target.files?.[0]; event.target.value = '';
              if (!file || !/\.docx$/i.test(file.name)) return;
              setDocxFailed(false); setPreviewFailed(false); setPickedFile(file); void saveSourceFile(scanId, file);
            }} />
          </label>}
        </div>}
        <p className="px-4 py-2 text-center text-xs text-slate-700">References and very short sections are not compared.</p>
        <div className={docxFile || fallbackFile ? 'w-full px-2 py-3 sm:px-4' : 'mx-auto w-full max-w-[78ch] px-5 py-7 sm:px-10 sm:py-10 lg:px-12'}>
          {sourceLoading && !sourceDocx ? <p role="status" className="text-sm text-gray-600">Opening your manuscript...</p> : docxFile ? <><DocxManuscript ref={docxView} file={docxFile} highlights={docxHighlights} locked={locked} secondSection={result.manuscript_sections?.[1]?.name} onLinked={setDocxLinked} onFailed={() => setDocxFailed(true)} />{locked && <ManuscriptSections result={result} locked unlockControl={unlockControl} placeholderOnly />}</> : fallbackFile ? <DocxPreview file={fallbackFile} autoLoad onFailed={() => setPreviewFailed(true)} /> : result.manuscript_sections ? <ManuscriptSections result={result} onHighlight={id => focusLinked('recommendation', id)} locked={locked} unlockControl={unlockControl} revealed={unlockedToast} /> : manuscriptLoading && result.analysis_run_id ? <p className="text-sm text-gray-600">Loading manuscript text…</p> : (manuscriptText
            ? <article className="whitespace-pre-wrap break-words font-serif text-sm sm:text-base leading-8 text-gray-800">{highlighted(manuscriptText)}</article>
            : isGoogleDoc ? <ManuscriptViewer result={result} reason={manuscriptReason} />
            : <div className="mx-auto flex max-w-[420px] flex-col items-center py-8 text-center"><ResultsScorePanel result={result} large /><p className="mt-5 text-sm leading-6 text-[#4b5563]">This report was created before manuscripts were stored, so the text can't be shown. Re-scan to see your manuscript with highlights.</p></div>)}
          <BackToTop container={manuscriptScroll} label="Back to top of the manuscript" />
        </div>
      </div>
      <aside tabIndex={0} aria-label="Analysis panel" className="results-scroll order-1 w-full min-w-0 shrink-0 rounded-2xl bg-white shadow-[0_10px_35px_#0b0f3d08] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1a1fcc] lg:order-2 lg:w-[clamp(380px,28vw,520px)] lg:rounded-none lg:shadow-none lg:overflow-y-auto print:hidden">
        <div>
          <ResultsScorePanel result={result} items={recommendations} linkedIds={linkedIds} revealId={revealId} onShowInManuscript={id => focusLinked('highlight', id)} onShowPlacement={showPlacement} hideBreakdown={selectedOrder != null && activeTab === 'recommendations'} />
            {result.rescan_unchanged && <p role="note" className="mx-4 mb-1 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900">No changes detected since your last scan of this manuscript, so this report matches the previous one.</p>}
            {result.structure_note && <p role="note" className="mx-4 mb-1 mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs leading-relaxed text-indigo-900 print:hidden">{result.structure_note}</p>}
            {selectedOrder != null && activeTab === 'recommendations' && <button type="button" onClick={() => setSelectedOrder(null)} className="mx-4 mt-3 flex items-center gap-2 text-[13.5px] font-extrabold text-[#2b25c8] focus-visible:outline-2 focus-visible:outline-offset-2 print:hidden">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Back to all findings</button>}
            <div className="scrollbar-none flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-3 print:hidden" role="tablist" aria-label="Results tabs">
              {tabs.map((tab, index) => <button key={tab.id} type="button" role="tab" id={`results-tab-${tab.id}`} aria-selected={activeTab === tab.id} aria-controls="results-tab-panel" tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => { setActiveTab(tab.id); setSelectedOrder(null); }} onKeyDown={event => {
                  const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
                  if (next < 0) return;
                  event.preventDefault();
                  setActiveTab(tabs[next].id);
                  setSelectedOrder(null);
                  document.getElementById(`results-tab-${tabs[next].id}`)?.focus();
                }} className={`px-3 py-3 text-xs font-bold border-b-2 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1a1fcc] ${activeTab === tab.id ? 'border-[#1a1fcc] text-[#1a1fcc]' : 'border-transparent text-[#4b5563]'}`}>{tab.label}</button>)}
            </div>
            <div id="results-tab-panel" role="tabpanel" aria-labelledby={`results-tab-${activeTab}`} tabIndex={0} className="px-4 py-5">
              {activeTab === 'recommendations' && <div className="space-y-4">
                <RecommendationsList items={recommendations} pairs={result.manuscript_flow} linkedIds={linkedIds} onShowInManuscript={id => focusLinked('highlight', id)} onShowPlacement={showPlacement} revealId={revealId} onlyOrders={lockedOrders} score={result.overall_coherence_score} rateLimited={rateLimited} selectedOrder={selectedOrder} onSelect={selectFinding} />
              </div>}
              {activeTab === 'clear' && <RecommendationsList items={recommendations} pairs={result.manuscript_flow} linkedIds={linkedIds} onShowInManuscript={id => focusLinked('highlight', id)} revealId={revealId} mode="clear" />}
              {activeTab === 'citations' && (locked ? <div className="rounded-xl border border-[#dfe5f5] bg-[#e9edf8] p-4 text-sm text-[#0b0f3d]"><p className="font-semibold">{result.access!.locked_counts.citations} {result.access!.locked_counts.citations === 1 ? 'citation' : 'citations'} checked in the full report</p></div> : <CitationsTab citationFilter={citationFilter} setCitationFilter={setCitationFilter} displayedCitations={displayedCitations}
                citationsCount={citations.length} citeCount={citeCount} renderCitation={renderCitation} scan={result} />)}
            </div>
        </div>
        {locked && <div className="rp-unlock print:hidden">
          <p className="rp-unlock-title">{result.access!.locked_counts.recommendations} more {result.access!.locked_counts.recommendations === 1 ? 'suggestion' : 'suggestions'} in the full report</p>
          {unlockControl}
        </div>}
      </aside>
    </main>
  </div>;
}

