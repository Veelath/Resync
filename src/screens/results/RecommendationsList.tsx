import { Fragment, useState } from 'react';
import type { ManuscriptFlowPair } from '../../services/v7Result';
import { categoryColors, type RecommendationCategory } from './categoryColors';
import { plainText } from './helpers';
import type { Placement } from '../../lib/sectionNavigation';
import { sectionDisplayName, severityRank, usablePair, type Sections } from './recommendationPresentation';

export interface RecommendationItem {
  id: string;
  pair: number;
  pairLabel: string;
  section?: string;
  quote: string | null;
  issue?: string;
  kind?: 'edit' | 'add';
  placement?: 'start' | 'end';
  /** For a sentence to add: the existing sentence it goes right after (end) or right before (start). */
  anchor?: string;
  revision: string;
  category?: RecommendationCategory;
}

export type Severity = 'Critical' | 'Moderate' | 'Minor';
/** A pair with no contradiction but a loose link: it gets linking sentences to add, and costs no points. */
export type CardLevel = Severity | 'Suggestion';

export const severityTones = {
  Critical: { background: '#fecdd3', border: '#e11d48', ink: '#881337', description: 'the sections directly contradict each other' },
  Moderate: { background: '#fed7aa', border: '#ea580c', ink: '#7c2d12', description: 'a claim, method, goal or number does not match' },
  Minor: { background: '#bae6fd', border: '#0284c7', ink: '#075985', description: 'a small term, figure or name differs' },
} as const;
export const inconsistencyTone = { background: '#fef3c7', border: '#f59e0b', description: 'a quoted passage that disagrees' };
export const provisionalMessage = "Some AI reviews could not finish because the AI's temporary limit was reached. This score is provisional; try scanning again later.";
export function isRateLimited(reviewStatus: { status: string; reason?: string } | undefined): boolean {
  return reviewStatus?.status === 'daily_limit' || (reviewStatus?.status === 'partial' && reviewStatus.reason === 'rate_limited');
}

const VISIBLE_FIXES = 2;

// Chronological triage cards: red = Critical, orange = Moderate, blue = Minor; green and gray rows for the rest.
const LEVELS: Record<CardLevel, { verdict: string; bar: string; chip: string; label: string }> = {
  Critical: { verdict: 'are not aligned', bar: 'border-l-rose-500', chip: 'bg-rose-50 text-rose-800', label: 'Critical' },
  Moderate: { verdict: 'are only partly aligned', bar: 'border-l-orange-500', chip: 'bg-orange-50 text-orange-800', label: 'Moderate' },
  Minor: { verdict: 'have a small gap', bar: 'border-l-sky-500', chip: 'bg-sky-50 text-sky-800', label: 'Minor' },
  Suggestion: { verdict: 'could connect more smoothly', bar: 'border-l-indigo-400', chip: 'bg-indigo-50 text-indigo-800', label: 'Suggestion' },
};

const clip = (text: string, max: number) => text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

function problemOf(pair: ManuscriptFlowPair) {
  const explanation = pair.explanation;
  const text = explanation?.link_summary || explanation?.highlighted_inconsistencies.find(item => item.what)?.what;
  return text ? plainText(text) : 'The relationship between these sections is unclear, so readers may struggle to follow the argument.';
}

/** Reports saved before severity existed carry none: a pair with advice counts as Moderate, the rest as unreviewed. */
export function severityOf(pair: ManuscriptFlowPair, hasItems: boolean): Severity | 'None' | null {
  return pair.severity !== undefined ? pair.severity : hasItems ? 'Moderate' : null;
}

/** What the card should show: a clear pair that still has linking sentences to add is a suggestion, not "all clear". */
export function levelOf(pair: ManuscriptFlowPair, hasItems: boolean): CardLevel | 'None' | null {
  const severity = severityOf(pair, hasItems);
  return severity === 'None' && hasItems ? 'Suggestion' : severity;
}

/** One pair with a real issue: why, the lines involved, and the suggested edits. Shared by the list and the dimension view. */
export function PairIssueCard({ pair, items, severity, linkedIds, onShowInManuscript, onShowPlacement, revealId, showAll = false, selected = false, onSelect, alwaysOpen = false, sections = [] }: {
  pair: ManuscriptFlowPair;
  sections?: Sections;
  items: RecommendationItem[];
  severity: CardLevel;
  linkedIds: Set<string>;
  onShowInManuscript: (id: string) => void;
  /** Scrolls to where a new sentence belongs and marks the spot. */
  onShowPlacement?: (section: string, placement: Placement, sentence?: string) => void;
  revealId: string | null;
  /** Show every step (the printed report has no 'show more' button). */
  showAll?: boolean;
  /** In the list a card starts closed; choosing it opens it and shows where it is in the paper. Without onSelect it is always open. */
  selected?: boolean;
  onSelect?: () => void;
  /** Every card shows its full explanation and steps, not only the chosen one. */
  alwaysOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const level = LEVELS[severity];
  const nameOf = (name: string) => sectionDisplayName(name, sections);
  const open = showAll || expanded || items.slice(VISIBLE_FIXES).some(item => item.id === revealId);
  const hidden = items.length - VISIBLE_FIXES;
  const adds = items.filter(item => item.kind === 'add');
  const quick = items.length > 0 && adds.length === items.length;
  const categoryKey = items.map(item => item.category).find(Boolean);
  const category = categoryKey ? categoryColors[categoryKey].label : null;
  const rawProblem = (severity === 'Suggestion' ? 'The connection between these sections is unclear, so readers may struggle to follow the argument' : problemOf(pair)).split(/(?<=[.!?])\s+/)[0].replace(/[.!?]+$/, '');
  const title = /\b(?:because|so|therefore|which)\b/i.test(rawProblem) ? `${rawProblem}.` : `${rawProblem}, which can make the connection unclear.`;
  const tag = severity === 'Suggestion' ? { text: 'Connection needs clarification', cls: 'text-amber-700' } : { text: `${level.label}: ${{ Critical: 'serious mismatch', Moderate: 'mismatch to review', Minor: 'small mismatch' }[severity]}`, cls: severity === 'Critical' ? 'text-rose-600' : severity === 'Moderate' ? 'text-orange-600' : 'text-sky-600' };
  const chip = 'rounded-md bg-[#eeeefe] px-2 py-0.5 text-[11px] font-semibold text-[#2b25c8]';
  const stepNumber = 'grid size-5 shrink-0 place-items-center rounded-full bg-[#eeeefe] text-[11px] font-bold text-[#2b25c8]';
  const outlineButton = 'inline-flex items-center gap-1.5 rounded-xl border border-[#d9d7f7] bg-white px-4 py-2 text-xs font-bold text-[#2b25c8] hover:bg-[#f6f6ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b25c8]';
  const copy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(id); window.setTimeout(() => setCopied(current => current === id ? null : current), 1800); }).catch(() => undefined);
  };
  const collapsible = !!onSelect && !alwaysOpen;
  const head = <>
    <h3 className="text-lg font-extrabold leading-snug text-[#0b0f3d]">{title}</h3>
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${items.length && items.length <= 2 ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-[#2b25c8]'}`}>
        <span aria-hidden="true">✦</span>{!items.length ? 'Needs a look' : items.length <= 2 ? `Quick fix · ${quick ? `add ${adds.length} ${adds.length === 1 ? 'sentence' : 'sentences'}` : `change ${items.length} ${items.length === 1 ? 'part' : 'parts'}`}` : `${items.length} fixes`}
      </span>
      {category && <span className="text-[11px] font-medium text-gray-500">Category: {category}</span>}
      {pair.adjacent === false && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600" title="These two sections are not next to each other in your paper">Cross-chapter</span>}
    </div>
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={chip}>{nameOf(pair.section_a)}</span>
      <span className={`text-[11px] font-bold ${tag.cls}`}>— {tag.text}</span>
      <span className={chip}>{nameOf(pair.section_b)}</span>
    </div>
  </>;
  const frame = `space-y-3 rounded-2xl border bg-white p-4 ${!!onSelect && selected ? 'border-[#2b25c8] shadow-[0_0_0_3px_rgba(43,37,200,.14)]' : 'border-[#e3e1fa] shadow-[0_1px_3px_rgba(26,31,204,.06)]'}`;
  if (collapsible && !selected) {
    return <section data-pair-order={pair.order} aria-label={`${pair.section_a} and ${pair.section_b}`} className={`${frame} cursor-pointer transition hover:-translate-y-px hover:border-[#b9b6f2]`}>
      <div role="button" tabIndex={0} aria-expanded="false" onClick={onSelect} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(); } }} className="space-y-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2b25c8]">
        {head}
        <span className="block text-[13px] font-extrabold text-[#2b25c8]">Show me where →</span>
      </div>
    </section>;
  }
  return <section data-pair-order={pair.order} aria-label={`${pair.section_a} and ${pair.section_b}`} className={frame}>
    {head}
    <div className="space-y-3 border-t border-[#eeedfb] pt-3">
    {items.length > 0 && <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">What to do</p>
      <ol className="space-y-4">
        {items.map((item, index) => {
          const sentence = plainText(item.revision);
          const where = item.placement === 'start' ? 'beginning' : 'end';
          return <li key={item.id} id={`recommendation-${item.id}`} tabIndex={-1} hidden={index >= VISIBLE_FIXES && !open} className="scroll-mt-12 space-y-2.5 text-sm leading-snug text-[#303746]">
            {item.kind === 'add'
              ? <>
                  <p className="flex items-start gap-2"><span className={stepNumber}>1</span><span>Go to the <strong className="text-[#0b0f3d]">{where} of <span>{item.section && nameOf(item.section)}</span></strong>.</span></p>
                  <p className="flex items-start gap-2"><span className={stepNumber}>2</span><span>Add this sentence:</span></p>
                  <p className="ml-7 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2.5 font-serif text-[14px] leading-relaxed text-[#0b3d1f]">{sentence}</p>
                  {item.anchor && <p className="ml-7 text-xs text-gray-500">{item.placement === 'start' ? 'Right before' : 'Right after'}: <span className="font-serif text-gray-700">“{clip(item.anchor, 140)}”</span></p>}
                  <div className="ml-7 flex flex-wrap gap-2">
                    <button type="button" onClick={() => copy(item.id, sentence)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#2b25c8] px-4 py-2 text-xs font-bold text-white hover:bg-[#1f1aa6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b25c8]">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>
                      {copied === item.id ? 'Copied!' : 'Copy sentence'}</button>
                    {(linkedIds.has(`${pair.order}:${item.id}`) || (onShowPlacement && item.section && item.placement)) && <button type="button" onClick={() => linkedIds.has(`${pair.order}:${item.id}`) ? onShowInManuscript(item.id) : onShowPlacement?.(item.section!, item.placement!, sentence)} className={outlineButton}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                      Show me where</button>}
                  </div>
                </>
              : <>
                  <p className="flex items-start gap-2"><span className={stepNumber}>1</span><span>{item.section ? <>Go to <strong className="text-[#0b0f3d]">{nameOf(item.section)}</strong> and find:</> : 'Find this part:'}</span></p>
                  {item.quote ? <p className="ml-7 rounded-lg bg-[#f6f7fb] px-3 py-2 font-serif text-[13px] text-gray-700">“{clip(item.quote, 160)}”</p> : null}
                  <p className="flex items-start gap-2"><span className={stepNumber}>2</span><span>Replace it with this sentence:</span></p>
                  <p className="ml-7 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2.5 font-serif text-[14px] leading-relaxed text-[#0b3d1f]">{sentence}</p>
                  <button type="button" onClick={() => copy(item.id, sentence)} className="ml-7 rounded-xl bg-[#2b25c8] px-4 py-2 text-xs font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b25c8]">{copied === item.id ? 'Copied!' : 'Copy sentence'}</button>
                  {(linkedIds.has(`${pair.order}:${item.id}`) || (onShowPlacement && item.section)) && <div className="ml-7"><button type="button" onClick={() => linkedIds.has(`${pair.order}:${item.id}`) ? onShowInManuscript(item.id) : onShowPlacement?.(item.section!, 'start')} className={outlineButton}>Show me where</button></div>}
                </>}
          </li>;
        })}
      </ol>
      {hidden > 0 && <button type="button" aria-expanded={open} onClick={() => setExpanded(!open)} className="mt-2 text-xs font-semibold text-[#2b25c8] underline focus-visible:outline-2 focus-visible:outline-offset-2">{open ? 'Show fewer steps' : `Show ${hidden} more ${hidden === 1 ? 'step' : 'steps'}`}</button>}
    </div>}
    </div>
  </section>;
}

export function RecommendationsList({ items, pairs, linkedIds, onShowInManuscript, onShowPlacement, revealId, onlyOrders, mode = 'issues', rateLimited = false, showAll = false, selectedOrder = null, onSelect, sections = [] }: {
  items: RecommendationItem[];
  pairs: ManuscriptFlowPair[];
  sections?: Sections;
  linkedIds: Set<string>;
  onShowInManuscript: (id: string, pair: number) => void;
  onShowPlacement?: (section: string, placement: Placement, sentence?: string) => void;
  revealId: string | null;
  onlyOrders?: Set<number>;
  /** 'issues' lists only pairs that need editing; 'clear' lists the pairs that need no action. */
  mode?: 'issues' | 'clear';
  rateLimited?: boolean;
  showAll?: boolean;
  /** The finding that is open (null: all closed) and what to do when one is chosen. */
  selectedOrder?: number | null;
  onSelect?: (order: number) => void;
}) {
  const rows = pairs
    .filter(pair => usablePair(pair, sections) && pair.scores.overall_coherence != null && (!onlyOrders || onlyOrders.has(pair.order)))
    .map(pair => {
      const pairItems = items.filter(item => item.pair === pair.order && plainText(item.revision).trim());
      return { pair, pairItems, severity: levelOf(pair, pairItems.length > 0) };
    })
    .filter(row => mode === 'issues' ? row.pairItems.length > 0 && row.severity !== null && row.severity !== 'None' : row.severity === 'None')
    .sort((a, b) => severityRank(a.severity === 'Suggestion' ? 'None' : a.severity) - severityRank(b.severity === 'Suggestion' ? 'None' : b.severity) || a.pair.order - b.pair.order);
  // Pairs the AI could not judge are not "fine": they are shown with the recommendations as something still to do.
  const unreviewed = pairs
    .filter(pair => usablePair(pair, sections) && pair.scores.overall_coherence != null && (!onlyOrders || onlyOrders.has(pair.order)))
    .filter(pair => severityOf(pair, items.some(item => item.pair === pair.order)) === null);

  return <div className="space-y-3">
    {rows.map(({ pair, pairItems, severity }) => {
      const names = <><span>{sectionDisplayName(pair.section_a, sections)}</span> <span aria-label="and" className="text-gray-400">↔</span> <span>{sectionDisplayName(pair.section_b, sections)}</span></>;
      if (severity === 'None') {
        // A low-rated pair that Gemini judged logically fine is a false alarm: reassure the student, no action needed.
        const falseAlarm = (pair.scores.overall_coherence ?? 1) < 0.85;
        return <div key={pair.order} className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 font-semibold text-emerald-900">{names}</span>
            {!falseAlarm && <span className="shrink-0 text-xs font-semibold text-emerald-700">No issues found.</span>}
          </div>
          {falseAlarm && <p className="mt-0.5 flex items-start gap-1.5 text-xs font-semibold text-emerald-700"><svg aria-hidden="true" viewBox="0 0 20 20" className="mt-px size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="8" /><path d="M6.5 10.3l2.4 2.4 4.6-5" /></svg><span>Minor vocabulary difference detected. No action needed.</span></p>}
        </div>;
      }
      return <Fragment key={pair.order}><PairIssueCard sections={sections} pair={pair} items={pairItems} severity={severity} linkedIds={linkedIds} onShowInManuscript={id => onShowInManuscript(id, pair.order)} onShowPlacement={onShowPlacement} revealId={revealId} showAll={showAll}
        selected={selectedOrder === pair.order} onSelect={onSelect && (() => onSelect(pair.order))} alwaysOpen /></Fragment>;
    })}
    {mode === 'issues' && unreviewed.length > 0 && <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-semibold text-amber-900">{rateLimited
        ? provisionalMessage
        : `${unreviewed.length} section ${unreviewed.length === 1 ? 'pair' : 'pairs'} could not be reviewed by the AI, so we can’t say whether ${unreviewed.length === 1 ? 'it is' : 'they are'} fine. Scan again to retry.`}</p>
      <ul className="space-y-1 text-xs text-amber-900">{unreviewed.map(pair => <li key={pair.order} >{sectionDisplayName(pair.section_a, sections)} ↔ {sectionDisplayName(pair.section_b, sections)}</li>)}</ul>
    </div>}
    {!rows.length && !(mode === 'issues' && unreviewed.length > 0) && <p className="text-sm text-gray-500">{mode === 'issues' ? 'No recommendations to show.' : 'Nothing here yet.'}</p>}
  </div>;
}
