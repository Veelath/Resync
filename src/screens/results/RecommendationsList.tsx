import { Fragment, useState } from 'react';
import type { ManuscriptFlowPair } from '../../services/v7Result';
import type { RecommendationCategory } from './categoryColors';
import { plainText } from './helpers';

export interface RecommendationItem {
  id: string;
  pair: number;
  pairLabel: string;
  section?: string;
  quote: string | null;
  issue?: string;
  kind?: 'edit' | 'add';
  placement?: 'start' | 'end';
  revision: string;
  category?: RecommendationCategory;
}

export type Severity = 'Critical' | 'Moderate' | 'Minor';

const VISIBLE_FIXES = 2;

// Chronological triage cards: red = Critical, orange = Moderate, blue = Minor; green and gray rows for the rest.
const LEVELS: Record<Severity, { verdict: string; bar: string; chip: string; label: string }> = {
  Critical: { verdict: 'are not aligned', bar: 'border-l-rose-500', chip: 'bg-rose-50 text-rose-800', label: 'Critical' },
  Moderate: { verdict: 'are only partly aligned', bar: 'border-l-orange-500', chip: 'bg-orange-50 text-orange-800', label: 'Moderate' },
  Minor: { verdict: 'have a small gap', bar: 'border-l-sky-500', chip: 'bg-sky-50 text-sky-800', label: 'Minor' },
};

const clip = (text: string, max: number) => text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

function problemOf(pair: ManuscriptFlowPair) {
  const explanation = pair.explanation;
  const text = explanation?.link_summary || explanation?.highlighted_inconsistencies.find(item => item.what)?.what;
  return text ? plainText(text) : 'These two sections do not connect clearly.';
}

// What each section says about the point of disagreement: Gemini's short phrase, else a clipped source line.
function saysOf(pair: ManuscriptFlowPair, side: 'a' | 'b') {
  const name = side === 'a' ? pair.section_a : pair.section_b;
  const explanation = pair.explanation;
  const phrase = explanation?.comparison?.[side === 'a' ? 'a_says' : 'b_says'];
  if (phrase) return plainText(phrase);
  const quote = explanation?.highlighted_inconsistencies.find(item => item.section === name && item.quote)?.quote
    ?? explanation?.reference_list.find(item => item.section === name)?.sentence
    ?? pair.culprit_sentences[side === 'a' ? 'section_a' : 'section_b'][0]?.sentence;
  return quote ? `“${clip(plainText(quote), 110)}”` : null;
}

/** Reports saved before severity existed carry none: a pair with advice counts as Moderate, the rest as unreviewed. */
export function severityOf(pair: ManuscriptFlowPair, hasItems: boolean): Severity | 'None' | null {
  return pair.severity !== undefined ? pair.severity : hasItems ? 'Moderate' : null;
}

/** One pair with a real issue: why, the lines involved, and the suggested edits. Shared by the list and the dimension view. */
export function PairIssueCard({ pair, items, severity, linkedIds, onShowInManuscript, revealId }: {
  pair: ManuscriptFlowPair;
  items: RecommendationItem[];
  severity: Severity;
  linkedIds: Set<string>;
  onShowInManuscript: (id: string) => void;
  revealId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const level = LEVELS[severity];
  const saysA = saysOf(pair, 'a');
  const saysB = saysOf(pair, 'b');
  const lines = items.length ? [] : (pair.explanation?.highlighted_inconsistencies ?? []).filter(item => item.quote);
  const open = expanded || items.slice(VISIBLE_FIXES).some(item => item.id === revealId);
  const hidden = items.length - VISIBLE_FIXES;
  return <section aria-label={`${pair.section_a} and ${pair.section_b}`} className={`rounded-xl border border-gray-200 border-l-4 ${level.bar} bg-white p-3 space-y-3`}>
    <div className="flex items-start justify-between gap-2">
      <h3 className="text-base font-bold leading-snug text-[#0b0f3d]">Your <span className="capitalize">{pair.section_a}</span> and your <span className="capitalize">{pair.section_b}</span> {level.verdict}.</h3>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${level.chip}`}>{level.label}</span>
        {pair.adjacent === false && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600" title="These two sections are not next to each other in your paper">Cross-chapter</span>}
      </span>
    </div>
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-rose-700">Here’s why</p>
      <p className="text-sm leading-snug text-[#303746]">{problemOf(pair)}</p>
      {(saysA || saysB) && <ul className="mt-1.5 space-y-1 text-sm leading-snug text-[#303746]">
        {saysA && <li className="flex gap-2"><span aria-hidden="true" className="text-gray-400">•</span><span><span className="font-semibold capitalize text-[#0b0f3d]">{pair.section_a}</span> says: {saysA}</span></li>}
        {saysB && <li className="flex gap-2"><span aria-hidden="true" className="text-gray-400">•</span><span><span className="font-semibold capitalize text-[#0b0f3d]">{pair.section_b}</span> says: {saysB}</span></li>}
      </ul>}
      {lines.length > 0 && <ul className="mt-1.5 space-y-1">{lines.map((item, index) => <li key={index} className="rounded-md bg-[#f6f7fb] p-2 font-serif text-[13px] text-[#303746]"><span className="block font-sans text-xs font-semibold capitalize text-gray-600">In {item.section}</span>“{clip(plainText(item.quote), 160)}”</li>)}</ul>}
    </div>
    {items.length > 0 && <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#1a1fcc]">Suggested parts to edit</p>
      <ol className="space-y-2">
        {items.map((item, index) => <li key={item.id} id={`recommendation-${item.id}`} tabIndex={-1} hidden={index >= VISIBLE_FIXES && !open} className="scroll-mt-12 space-y-1 rounded-lg border border-[#dfe5f5] p-2.5 text-sm leading-snug text-[#303746]">
          {item.kind === 'add'
            ? <>
                <p className="text-xs font-semibold text-gray-600">Add this sentence at the {item.placement === 'start' ? 'start' : 'end'} of <span className="capitalize">{item.section}</span></p>
                <p className="rounded-md bg-[#f6f7fb] p-2 font-serif text-[14px] text-[#303746]">“{plainText(item.revision)}”</p>
              </>
            : <>
                {item.section && <p className="text-xs font-semibold capitalize text-gray-600">In {item.section}</p>}
                {item.quote ? <p className="font-serif text-[13px] text-gray-700">“{clip(item.quote, 140)}”</p> : null}
                <p><span className="font-semibold text-[#1a1fcc]">Edit: </span>{plainText(item.revision)}</p>
              </>}
          {linkedIds.has(item.id) && <button type="button" onClick={() => onShowInManuscript(item.id)} className="text-xs font-semibold text-[#1a1fcc] underline focus-visible:outline-2 focus-visible:outline-offset-2">Show in manuscript</button>}
        </li>)}
      </ol>
      {hidden > 0 && <button type="button" aria-expanded={open} onClick={() => setExpanded(!open)} className="mt-1.5 text-xs font-semibold text-[#1a1fcc] underline focus-visible:outline-2 focus-visible:outline-offset-2">{open ? 'Show fewer parts' : `Show ${hidden} more ${hidden === 1 ? 'part' : 'parts'} to edit`}</button>}
    </div>}
  </section>;
}

export function RecommendationsList({ items, pairs, linkedIds, onShowInManuscript, revealId, onlyOrders, mode = 'issues', dailyLimit = false }: {
  items: RecommendationItem[];
  pairs: ManuscriptFlowPair[];
  linkedIds: Set<string>;
  onShowInManuscript: (id: string) => void;
  revealId: string | null;
  onlyOrders?: Set<number>;
  /** 'issues' lists only pairs that need editing; 'clear' lists the pairs that need no action. */
  mode?: 'issues' | 'clear';
  /** The AI review could not run because the daily AI limit was reached. */
  dailyLimit?: boolean;
}) {
  const rows = pairs
    .filter(pair => pair.scores.overall_coherence != null && (!onlyOrders || onlyOrders.has(pair.order)))
    .map(pair => {
      const pairItems = items.filter(item => item.pair === pair.order);
      return { pair, pairItems, severity: severityOf(pair, pairItems.length > 0) };
    })
    .filter(row => mode === 'issues' ? row.severity !== null && row.severity !== 'None' : row.severity === 'None');
  // Pairs the AI could not judge are not "fine": they are shown with the recommendations as something still to do.
  const unreviewed = pairs
    .filter(pair => pair.scores.overall_coherence != null && (!onlyOrders || onlyOrders.has(pair.order)))
    .filter(pair => severityOf(pair, items.some(item => item.pair === pair.order)) === null);

  return <div className="space-y-3">
    {rows.map(({ pair, pairItems, severity }) => {
      const names = <><span className="capitalize">{pair.section_a}</span> <span aria-label="and" className="text-gray-400">↔</span> <span className="capitalize">{pair.section_b}</span></>;
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
      return <Fragment key={pair.order}><PairIssueCard pair={pair} items={pairItems} severity={severity} linkedIds={linkedIds} onShowInManuscript={onShowInManuscript} revealId={revealId} /></Fragment>;
    })}
    {mode === 'issues' && unreviewed.length > 0 && <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-semibold text-amber-900">{dailyLimit
        ? `The AI review is unavailable right now because the daily AI limit was reached, so ${unreviewed.length === 1 ? 'this pair' : `these ${unreviewed.length} pairs`} could not be checked. This does not mean ${unreviewed.length === 1 ? 'it is' : 'they are'} fine. Try again later.`
        : `${unreviewed.length} section ${unreviewed.length === 1 ? 'pair' : 'pairs'} could not be reviewed by the AI, so we can’t say whether ${unreviewed.length === 1 ? 'it is' : 'they are'} fine. Scan again to retry.`}</p>
      <ul className="space-y-1 text-xs text-amber-900">{unreviewed.map(pair => <li key={pair.order} className="capitalize">{pair.section_a} ↔ {pair.section_b}</li>)}</ul>
    </div>}
    {!rows.length && !(mode === 'issues' && unreviewed.length > 0) && <p className="text-sm text-gray-500">{mode === 'issues' ? 'No recommendations. Your sections are consistent with each other.' : 'Nothing here yet.'}</p>}
  </div>;
}
