import { notify } from '../../lib/notify';
import { allClearCount, clearPairs } from './clearPairs';
﻿import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { Screen } from '../../lib/appTypes';
import type { V7ScanResponse } from '../../services/v7Result';
import { reviewUnfinished } from './reviewComplete';
import { discardScan, getCreditBalance, getScanResult, unlockScan } from '../../services/api';
import { forgetOpenReport, rememberOpenReport } from '../../lib/openReport';
import { dropManuscriptFile, loadManuscriptFile, manuscriptFileFor } from '../../lib/manuscriptFile';
import { TextManuscript } from './TextManuscript';
import { DocxManuscript, type DocxManuscriptHandle } from './DocxManuscript';
import type { HighlightSpec } from '../../lib/docxHighlight';
import { SAMPLE_PAPERS, sampleById, type Citation } from '../../data/sampleReport';
import { ResultsHeader } from './ResultsHeader';
import { BackToTop } from '../../components/AppPrimitives';
import { ResultsScorePanel } from './ResultsScorePanel';
import { LeaveNotice } from './LeaveNotice';
import { reportFileName, reportPdfBlob } from '../../lib/reportPdf';
import { PdfPreview } from './PdfPreview';
import { CitationsTab } from './CitationsTab';
import { ManuscriptSections, ManuscriptViewer } from './ManuscriptViewer';
import { citationAccess, citationHasNoLink, citationLinkRange, citationContains, citationText, usableTitle } from './helpers';
import { edgeSentence, findSectionIndex, isWithheldSection, type Placement } from '../../lib/sectionNavigation';
import { matchedRecommendations, recommendationRanges } from './highlights';
import { ResultsCheckout } from './ResultsCheckout';
import { recommendationCategory, type RecommendationCategory } from './categoryColors';
import { RecommendationsList, inconsistencyTone, isRateLimited, levelOf, severityTones } from './RecommendationsList';
import { usablePair } from './recommendationPresentation';
import { plainText } from './helpers';

import './report-design.css';
import { FIRST_SCAN_FREE_ENABLED } from '../../lib/featureFlags';

type Tab = 'recommendations' | 'clear' | 'citations';

export function ResultsScreen({ onNavigate, onBack, scan, isSample, onScanUpdated }: { onNavigate: (screen: Screen) => void; onBack: () => void; scan?: V7ScanResponse | null; isSample?: boolean; onScanUpdated?: (scan: V7ScanResponse) => void }) {
  const [currentScan, setCurrentScan] = useState(scan);
  const manuscriptScroll = useRef<HTMLDivElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashedTarget = useRef<HTMLElement | null>(null);
  const [sampleId, setSampleId] = useState(() => sampleById(new URLSearchParams(window.location.search).get('paper')).id);
  const result = isSample ? sampleById(sampleId).result : currentScan;
  const isGoogleDoc = /^https?:\/\/docs\.google\.com\//i.test(result?.doc_url ?? '');
  const locked = !isSample && result?.access?.unlocked === false;
  const [balance, setBalance] = useState<number | null>(null);
  const [buyCredits, setBuyCredits] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const unlockPending = useRef(false);
  const unlockedId = useRef<string | null>(null);
  const [unlockError, setUnlockError] = useState('');
  const [unlockedToast, setUnlockedToast] = useState(false);
  const unlockNotice = useRef<string>('No credit was used.');
  const [placementMessage, setPlacementMessage] = useState('');
  // Leaving a real report: it is not kept, so the student is told first and can download the PDF.
  const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!isSample && result?.analysis_run_id) rememberOpenReport(result.analysis_run_id);
  }, [isSample, result?.analysis_run_id]);
  useEffect(() => {
    if (isSample) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isSample]);
  useEffect(() => setCurrentScan(scan), [scan]);
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);
  useEffect(() => {
    if (!locked || !result?.user_id) return;
    getCreditBalance(result.user_id).then(value => setBalance(value.balance)).catch(() => setBalance(null));
  }, [locked, result?.user_id]);
  const [activeTab, setActiveTab] = useState<Tab>('recommendations');
  const [revealId, setRevealId] = useState<string | null>(null);
  // The finding that is open in the side panel (its pair's order), or null when the whole list shows.
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [citationFilter, setCitationFilter] = useState<Citation['status'] | null>(null);
  // The manuscript as the student uploaded it (Word file, or the Google Doc downloaded as Word), kept in this tab's memory only.
  // If it is not there (a refresh, an older .doc, a link that could not be downloaded) or cannot be drawn, the stored text view is used.
  const docxView = useRef<DocxManuscriptHandle>(null);
  // The PDF is shown in a preview first; it is downloaded only from there.
  const [pdfPreview, setPdfPreview] = useState<{ url: string | null; name: string } | null>(null);
  const closePdfPreview = () => setPdfPreview(previous => { if (previous?.url) URL.revokeObjectURL(previous.url); return null; });
  const [docxFailed, setDocxFailed] = useState(false);
  const [docxLinked, setDocxLinked] = useState<Set<string> | null>(null);
  const [textFailed, setTextFailed] = useState(false);
  const [storedFile, setStoredFile] = useState<File | null>(null);
  // After a refresh the file is no longer in memory: it comes back from this browser's own storage, so the report still shows the exact copy.
  useEffect(() => {
    setStoredFile(null);
    if (isSample || !result?.analysis_run_id || manuscriptFileFor(result.analysis_run_id)) return;
    let cancelled = false;
    void loadManuscriptFile(result.analysis_run_id).then(file => { if (!cancelled) setStoredFile(file); });
    return () => { cancelled = true; };
  }, [isSample, result?.analysis_run_id]);
  const ownFile = isSample ? null : manuscriptFileFor(result?.analysis_run_id) ?? storedFile;
  const isDocx = !!ownFile && /\.docx$/i.test(ownFile.name);
  // The same exact copy for a Word file and a Google Doc: page by page when the whole file can be drawn, else its complete text.
  const wordFile = isDocx && !docxFailed ? ownFile : null;
  const textFile = isDocx && docxFailed && !textFailed ? ownFile : null;
  const docxFile = wordFile ?? textFile;
  useEffect(() => { setDocxFailed(false); setTextFailed(false); setDocxLinked(null); }, [result?.analysis_run_id]);
  useEffect(() => { setDocxLinked(null); }, [locked]);
  if (!result) return null;

  const unfinished = locked && reviewUnfinished(result.ai_synthesis?.review_status);
  const firstFree = FIRST_SCAN_FREE_ENABLED && !isSample && (result as { access?: { first_free?: boolean } }).access?.first_free === true;
  useEffect(() => {
    if (firstFree && locked && !unfinished && !unlockPending.current && unlockedId.current !== result.analysis_run_id) void handleUnlock();
  }, [firstFree, locked, unfinished, result.analysis_run_id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUnlock() {
    if (!result || !locked || unfinished || unlockPending.current) return;
    if (balance === 0 && !firstFree && unlockedId.current !== result.analysis_run_id) { setBuyCredits(true); return; }
    unlockPending.current = true;
    setUnlocking(true);
    setUnlockError('');
    try {
      if (unlockedId.current !== result.analysis_run_id) {
        const response = await unlockScan(result.analysis_run_id);
        unlockedId.current = result.analysis_run_id;
        setBalance(response.credits_remaining);
        unlockNotice.current = !response.charged ? 'No credit was used.' : response.credits_remaining == null ? '1 credit used.' : `1 credit used. You have ${response.credits_remaining} credits left.`;
      }
      const full = await getScanResult(result.analysis_run_id);
      if (full.result_version !== 'v7') throw new Error('The full report is not ready. Refresh and try again.');
      setCurrentScan(full as V7ScanResponse);
      onScanUpdated?.(full as V7ScanResponse);
      notify({ kind: 'success', title: 'Full report unlocked', message: unlockNotice.current });
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
      {unlocking ? 'Unlocking…' : firstFree ? 'Open your free report' : balance === 0 ? 'Buy credits' : 'Unlock full report (1 credit)'}
    </button>
    <p className="text-center text-xs text-[#4b5563]">{balance == null ? 'Checking credit balance' : `You have ${balance} ${balance === 1 ? 'credit' : 'credits'}`}</p>
    {unlockError && <p role="alert" className="text-sm text-[#9f1239]">{unlockError} {balance === 0 ? 'Buy credits to continue.' : 'Try again.'}</p>}
  </div>;

  const displayTitle = isSample ? sampleById(sampleId).result.manuscript_title : usableTitle(result.manuscript_title)
    || (isGoogleDoc ? 'Google Docs manuscript' : result.doc_url.split(/[\\/]/).pop()?.replace(/\.(docx|pdf|doc)$/i, '')) || 'Document Coherence Scan';
  const matched = matchedRecommendations(result.manuscript_sections ?? [], result.recommendations);
  const recommendations = matched.filter(rec => plainText(rec.recommended_revision).trim()).slice(0, locked ? 2 : undefined).map(rec => ({ id: rec.id ?? rec.recommendation_id, section: rec.section ?? rec.section_b, quote: rec.original_sentence, issue: rec.issue, kind: rec.kind, placement: rec.placement, pair: rec.pair_order, pairLabel: `${rec.section_a} → ${rec.section_b}`, anchor: rec.kind === 'add' ? edgeSentence(result.manuscript_sections?.find(section => section.name === (rec.section ?? rec.section_b))?.text, rec.placement === 'start' ? 'start' : 'end') || undefined : undefined, revision: rec.recommended_revision, category: recommendationCategory((rec as typeof rec & { category?: RecommendationCategory }).category) }));
  // Pairs with a real issue (a severity above None); reports saved before severity existed count the pairs with advice.
  const hasAdvice = (order: number) => recommendations.some(rec => rec.pair === order);
  const visiblePairs = result.manuscript_flow.filter(pair => usablePair(pair, result.manuscript_sections));
  const issueCount = visiblePairs.filter(pair => pair.scores.overall_coherence != null && hasAdvice(pair.order) && levelOf(pair, true) !== null).length;
  const breakdown = result.dimension_breakdown ?? result.score_breakdown.dimension_breakdown;
  const clearCount = allClearCount(clearPairs(visiblePairs, hasAdvice, result.manuscript_sections, breakdown).clear.length, locked, result.display_counts?.all_clear, result.access?.locked_counts.all_clear);
  const lockedOrders = locked ? new Set<number>(recommendations.map(rec => rec.pair)) : undefined;
  const linkedIds = docxFile
    ? new Set<string>(recommendations.filter(rec => rec.kind !== 'add' ? (locked ? docxLinked?.has(`${rec.pair}-${rec.id}`) : !!rec.quote) : false).map(rec => `${rec.pair}:${rec.id}`))
    : new Set<string>(result.manuscript_sections?.flatMap(section => recommendationRanges(section, matched).map(range => `${range.pair}:${range.id}`)));
  // Colors follow the pair's grade, so a highlight in the paper matches the card that explains it. Ids match the text view: highlight-<pair>-<id>.
  const docxHighlights: HighlightSpec[] = docxFile ? [
    ...recommendations.flatMap(rec => {
      const pair = result.manuscript_flow.find(entry => entry.order === rec.pair);
      const tone = severityTones[(pair?.severity && pair.severity !== 'None' ? pair.severity : 'Moderate') as keyof typeof severityTones];
      const id = `${rec.pair}-${rec.id}`;
      const edge = rec.kind === 'add' ? edgeSentence(result.manuscript_sections?.find(section => section.name === rec.section)?.text, rec.placement === 'start' ? 'start' : 'end', 4000) : '';
      if (rec.kind === 'add') return edge ? [{ id, text: edge, background: '#ffe8a3', border: '#e0a53c', title: 'Click to see the finding', onClick: () => focusLinked('recommendation', rec.id, rec.pair) }] : [];
      return rec.quote ? [{ id, text: rec.quote, ...tone, title: 'Click to see why this was flagged', onClick: () => focusLinked('recommendation', rec.id, rec.pair) }] : [];
    }),
    ...result.manuscript_flow.flatMap(pair => (pair.explanation?.highlighted_inconsistencies ?? []).filter(item => item.quote).map((item, index) => ({
      id: `issue-${pair.order}-${index}`, text: item.quote, ...inconsistencyTone, title: 'Part of an inconsistency between sections',
    }))),
  ] : [];
  const rateLimited = isRateLimited(result.ai_synthesis?.review_status);

  function scrollToTarget(target: HTMLElement | null, flash = 1600) {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    const scroller = target?.closest<HTMLElement>('.results-scroll');
    if (target && scroller && window.matchMedia('(min-width: 1024px)').matches) {
      scroller.scrollTo({ top: scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - (scroller.clientHeight - target.clientHeight) / 2, behavior });
    } else target?.scrollIntoView({ block: 'center', behavior });
    target?.focus({ preventScroll: true });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashedTarget.current?.classList.remove('result-focus');
    if (target) void target.offsetWidth;
    target?.classList.add('result-focus');
    flashedTarget.current = target;
    flashTimer.current = setTimeout(() => target?.classList.remove('result-focus'), flash);
  }

  async function focusLinked(kind: 'recommendation' | 'highlight', id: string, pair?: number) {
    if (kind === 'recommendation') {
      setActiveTab('recommendations'); setRevealId(id);
      const found = recommendations.find(item => item.id === id && (pair === undefined || item.pair === pair));
      if (found) setSelectedOrder(found.pair);
    }
    const order = pair ?? recommendations.find(item => item.id === id)?.pair;
    if (kind === 'highlight' && docxFile && !locked) {   // pages of a long file are drawn in turns: load until the passage is there
      while (!document.getElementById(`highlight-${order}-${id}`) && await docxView.current?.loadNext()) { /* load until found */ }
    }
    requestAnimationFrame(() => {
      const target = kind === 'highlight' ? (manuscriptScroll.current?.querySelector<HTMLElement>(`[id="highlight-${order}-${CSS.escape(id)}"]`) ?? (docxFile ? manuscriptScroll.current?.querySelector<HTMLElement>(`mark[data-highlight-for$="-${CSS.escape(id)}"]`) : null)) : document.querySelector<HTMLElement>(`[aria-label="Analysis panel"] [data-pair-order="${order}"] [id="recommendation-${CSS.escape(id)}"]`);
      if (target) scrollToTarget(target);
      else if (kind === 'highlight') {
        const item = recommendations.find(rec => rec.id === id && rec.pair === order);
        if (item?.section) void showPlacement(item.section, item.placement ?? 'start');
      }
    });
  }

  // The highlight of the open finding gets a ring in the Word view.
  useEffect(() => {
    const ids = new Set(recommendations.filter(item => item.pair === selectedOrder).map(item => `${item.pair}-${item.id}`));
    document.querySelectorAll<HTMLElement>('.docx-host mark[data-highlight-for]').forEach(mark => {
      if (selectedOrder != null && ids.has(mark.dataset.highlightFor ?? '')) mark.dataset.selected = 'true'; else delete mark.dataset.selected;
    });
  });

  // Choosing a finding opens it and takes the reader to the matching spot in the paper.
  function selectFinding(order: number) {
    setActiveTab('recommendations');
    setSelectedOrder(order);
    const first = recommendations.find(item => item.pair === order);
    if (!first) return;
    if (linkedIds.has(`${first.pair}:${first.id}`)) focusLinked('highlight', first.id, first.pair);
    else if (first.kind === 'add' && first.section && first.placement) showPlacement(first.section, first.placement);
    else if (first.section) showPlacement(first.section, 'start');
  }

  // If the passage is absent, take the reader to the requested edge of the section.
  async function showPlacement(section: string, placement: Placement) {
    const names = (result?.manuscript_sections ?? []).map(item => item.name);
    const index = findSectionIndex(names, section);
    if (isWithheldSection(locked, index)) {
      setPlacementMessage('This part is in the full report. Unlock it to see where.');
      const unlock = manuscriptScroll.current?.querySelector<HTMLElement>('.locked-manuscript-card');
      if (unlock) { unlock.tabIndex = -1; scrollToTarget(unlock); }
      window.setTimeout(() => setPlacementMessage(''), 6000);
      return;
    }
    const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const sectionElement = docxFile
      ? [...(manuscriptScroll.current?.querySelectorAll<HTMLElement>('.docx-host p, .docx-host h1, .docx-host h2, .docx-host h3, .docx-host h4') ?? [])].find(element => normalize(element.textContent ?? '') === normalize(section) || normalize(element.textContent ?? '').replace(/^chapter \w+ /, '') === normalize(section)) ?? null
      : index < 0 ? null : manuscriptScroll.current?.querySelector<HTMLElement>(`[data-section-index="${index}"]`);
    const target = docxFile ? sectionElement : placement === 'end' ? sectionElement?.lastElementChild as HTMLElement | null : sectionElement?.querySelector<HTMLElement>('h2');
    if (target) {
      setPlacementMessage('');
      if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
      scrollToTarget(target, 2400);
      return;
    }
    setPlacementMessage(`We could not find the ${section} section in the page. Look for it by its heading and add the sentence there.`);
    window.setTimeout(() => setPlacementMessage(''), 6000);
  }
  const citations: Citation[] = result.citations.map((citation, index) => ({
    id: `cit-${index}`, ref: citationText(citation.citation_raw_reference_text), url: citation.citation_primary_link || '',
    status: citationAccess(citation), noLink: citationHasNoLink(citation), title: citationText(citation.citation_crossref_title),
    authors: citationText(citation.citation_authors_parsed), year: citation.citation_year_parsed,
  }));
  const displayedCitations = citationFilter ? citations.filter(citation => citation.status === citationFilter) : citations;
  const citeCount = (status: Citation['status']) => citations.filter(citation => citation.status === status).length;
  const askToLeave = (action: () => void) => setLeaveAction(() => action);
  async function downloadPdf() {
    const name = reportFileName(displayTitle);
    setPdfPreview({ url: null, name });
    let exactText: string | null = null;
    if (ownFile && /\.docx$/i.test(ownFile.name) && !locked) {   // an exact copy of the uploaded text, taken from the file itself
      try {   // the text of the paragraphs only: tables and pictures are not part of the report's copy
        const { value } = await (await import('mammoth')).convertToHtml({ arrayBuffer: await ownFile.arrayBuffer() });
        const page = new DOMParser().parseFromString(value, 'text/html');
        page.querySelectorAll('table, img').forEach(element => element.remove());
        exactText = [...page.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')].map(element => (element.textContent ?? '').trim()).filter(Boolean).join('\n');
      } catch { /* the stored sections are printed instead */ }
    }
    await new Promise(resolve => setTimeout(resolve, 30));   // let the "Preparing" state paint before the PDF is built
    const blob = reportPdfBlob(result!, displayTitle, citations.map(citation => ({ ref: citation.ref, status: citation.status, noLink: citation.noLink })), locked, exactText);
    setPdfPreview({ url: URL.createObjectURL(blob), name });
  }
  const tabs: { id: Tab; label: string }[] = [
    { id: 'recommendations', label: `Recommendations (${issueCount})` },
    { id: 'clear', label: `All clear (${clearCount})` },
    { id: 'citations', label: `Citations (${citations.length + (locked ? result.access!.locked_counts.citations : 0)})` },
  ];

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
    <ResultsHeader onNavigate={target => isSample ? onNavigate(target) : askToLeave(() => onNavigate(target))} onBack={() => isSample ? onBack() : askToLeave(onBack)}
      isSample={isSample} displayTitle={displayTitle} onDownload={downloadPdf} sampleId={sampleId} onSampleChange={id => { setSampleId(id); setActiveTab('recommendations'); setSelectedOrder(null); manuscriptScroll.current?.scrollTo({ top: 0 }); }} onClose={isSample ? undefined : () => askToLeave(() => onNavigate('dashboard'))} />
    {pdfPreview && <PdfPreview url={pdfPreview.url} fileName={pdfPreview.name} onClose={closePdfPreview} />}
    {leaveAction && <LeaveNotice leaving={leaving} onStay={() => setLeaveAction(null)} onDownload={downloadPdf} onLeave={async () => {
      setLeaving(true);
      const deleted = !!result?.analysis_run_id && await discardScan(result.analysis_run_id);
      if (deleted) forgetOpenReport();
      notify(deleted ? { kind: 'success', title: 'Report deleted', message: 'Your report was removed from our servers.' } : { kind: 'error', title: "Couldn't delete this report", message: 'It will be removed on your next visit.' });
      dropManuscriptFile();
      const go = leaveAction;
      setLeaving(false); setLeaveAction(null);
      go();
    }} />}
    {placementMessage && <div role="status" className="fixed top-16 right-4 z-50 max-w-sm rounded-xl bg-[#0b0f3d] px-5 py-3 text-sm font-semibold text-white shadow-lg print:hidden">{placementMessage}</div>}
    {buyCredits && <ResultsCheckout userId={result.user_id} balance={balance} onBalance={setBalance} onClose={() => setBuyCredits(false)} />}
    <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-4 pb-12 sm:px-6 lg:min-h-0 lg:max-w-none lg:flex-1 lg:flex-row lg:items-stretch lg:gap-px lg:bg-[#dfe5f5] lg:px-0 lg:pb-0 print:hidden">
      <div ref={manuscriptScroll} tabIndex={0} aria-label="Manuscript" className="results-scroll manuscript-scroll order-2 min-w-0 flex-1 rounded-2xl bg-white shadow-[0_10px_35px_#0b0f3d08] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1a1fcc] lg:order-1 lg:rounded-none lg:shadow-none lg:overflow-y-auto print:overflow-visible print:shadow-none">
        <div className={wordFile ? 'w-full px-2 py-3 sm:px-4' : 'mx-auto w-full max-w-[78ch] px-5 py-7 sm:px-10 sm:py-10 lg:px-12'}>
          {wordFile ? <DocxManuscript ref={docxView} file={wordFile} highlights={docxHighlights} locked={locked} secondSection={result.manuscript_sections?.[1]?.name} unlockControl={unlockControl} onLinked={setDocxLinked} onFailed={() => setDocxFailed(true)} /> : textFile ? <TextManuscript file={textFile} highlights={docxHighlights} locked={locked} secondSection={result.manuscript_sections?.[1]?.name} unlockControl={unlockControl} onLinked={setDocxLinked} onFailed={() => setTextFailed(true)} /> : result.manuscript_sections ? <ManuscriptSections result={result} onHighlight={(id, pair) => focusLinked('recommendation', id, pair)} locked={locked} unlockControl={unlockControl} revealed={unlockedToast} /> : locked ? <p>The available manuscript text is not shown for this report.</p> : <ManuscriptViewer result={result} />}
          <BackToTop container={manuscriptScroll} label="Back to top of the manuscript" />
        </div>
      </div>
      <aside tabIndex={0} aria-label="Analysis panel" className="results-scroll order-1 w-full min-w-0 shrink-0 rounded-2xl bg-white shadow-[0_10px_35px_#0b0f3d08] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1a1fcc] lg:order-2 lg:w-[clamp(380px,28vw,520px)] lg:rounded-none lg:shadow-none lg:overflow-y-auto print:hidden">
        <div>
          <ResultsScorePanel result={result} items={recommendations} linkedIds={linkedIds} revealId={revealId} onShowInManuscript={(id, pair) => focusLinked('highlight', id, pair)} onShowPlacement={showPlacement} hideBreakdown={selectedOrder != null && activeTab === 'recommendations'} />
            {result.rescan_unchanged && <p role="note" className="mx-4 mb-1 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900">No changes detected since your last scan of this manuscript, so this report matches the previous one.</p>}
            {result.structure_note && <p role="note" className="mx-4 mb-1 mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs leading-relaxed text-indigo-900 print:hidden">{result.structure_note}</p>}
            {selectedOrder != null && activeTab === 'recommendations' && <button type="button" onClick={() => setSelectedOrder(null)} className="mx-4 mt-3 flex items-center gap-2 text-[13.5px] font-extrabold text-[#2b25c8] focus-visible:outline-2 focus-visible:outline-offset-2 print:hidden">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Back to all findings</button>}
            <div className="flex flex-wrap items-center gap-x-1 border-b border-gray-200 px-3 print:hidden" role="tablist" aria-label="Results tabs">
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
                <RecommendationsList sections={result.manuscript_sections} items={recommendations} pairs={result.manuscript_flow} linkedIds={linkedIds} onShowInManuscript={(id, pair) => focusLinked('highlight', id, pair)} onShowPlacement={showPlacement} revealId={revealId} onlyOrders={lockedOrders} rateLimited={rateLimited} selectedOrder={selectedOrder} onSelect={selectFinding} />
              </div>}
              {activeTab === 'clear' && (locked && result.access?.locked_counts.all_clear != null
                ? <div className="space-y-2 text-sm text-gray-500"><p>Unlock the full report to see the sections with no issues.</p>{(result.access?.locked_counts.minor_points ?? result.display_counts?.minor_points ?? 0) > 0 && <p>Small issues that cost points: {result.access?.locked_counts.minor_points ?? result.display_counts?.minor_points}</p>}</div>
                : <RecommendationsList sections={result.manuscript_sections} items={recommendations} pairs={result.manuscript_flow} linkedIds={linkedIds} onShowInManuscript={(id, pair) => focusLinked('highlight', id, pair)} revealId={revealId} breakdown={breakdown} mode="clear" />)}
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

