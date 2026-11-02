import type { ReactNode } from 'react';
import type { DimensionBreakdown, DimensionKey, DimensionName, ManuscriptFlowPair } from '../../services/v7Result';

/** Every part is worth this many points; the four parts add up to the overall 100. */
export const PART_POINTS = 25;

/** A part's 0 to 100 score as points out of 25, with at most one decimal. */
export const toPoints = (score: number) => Math.round(score / 100 * PART_POINTS * 10) / 10;

export const formatPoints = (points: number) => Number.isInteger(points) ? String(points) : points.toFixed(1);

const percent = (value: number) => `${Math.round(value * 100)}%`;

/**
 * The explanation shown when a score box is hovered or focused: where the 25 points went, drawn as one bar, with the
 * weakest links behind the score in plain words. It is drawn with fixed position so the scrolling side panel cannot clip it.
 */
export function PartTooltip({ label, description, color, scoreKey, name, entry, rect, flow, clickable }: {
  label: string;
  description: string;
  color: string;
  scoreKey: DimensionKey;
  name: DimensionName;
  entry: DimensionBreakdown[DimensionName];
  rect: DOMRect;
  flow: ManuscriptFlowPair[];
  clickable: boolean;
}) {
  const applicable = entry.score !== 'N/A';
  const left = Math.min(Math.max(8, rect.left + rect.width / 2 - 156), window.innerWidth - 328);
  // Open on whichever side has more room and never taller than that room, scrolling inside if the explanation is long.
  const roomBelow = window.innerHeight - rect.bottom - 16;
  const roomAbove = rect.top - 16;
  const below = roomBelow >= 380 || roomBelow >= roomAbove;
  const position = below ? { top: rect.bottom + 8, maxHeight: roomBelow } : { bottom: window.innerHeight - rect.top + 8, maxHeight: roomAbove };

  let body: ReactNode;
  if (!applicable) {
    body = <p className="mt-2">{name === 'evidence_consistency'
      ? 'Your paper has no figures or numbers to compare, so this part is left out. The other parts share the 100 points.'
      : 'There was not enough text to judge this part, so it is left out. The other parts share the 100 points.'}</p>;
  } else {
    const score = entry.score as number;
    const baseline = Math.min(100, entry.baseline ?? Math.min(100, score + entry.penalty));
    const lostToLinks = toPoints(100 - baseline);
    const lostToIssues = toPoints(entry.penalty);
    const earned = toPoints(score);
    // The three pieces always add back to 25 on screen, even after rounding.
    const links = Math.min(lostToLinks, PART_POINTS - earned);
    const issues = Math.max(0, Math.round((PART_POINTS - earned - links) * 10) / 10);
    const weakest = flow
      .filter(pair => pair.adjacent !== false && typeof pair.scores[scoreKey] === 'number')
      .sort((a, b) => (a.scores[scoreKey] as number) - (b.scores[scoreKey] as number))
      .slice(0, 3)
      .filter(pair => (pair.scores[scoreKey] as number) < 0.8);
    body = <>
      <div className="mt-2.5" role="img" aria-label={`Of ${PART_POINTS} points: ${formatPoints(earned)} earned, ${formatPoints(links)} lost to loosely linked sections, ${formatPoints(issues)} lost to contradictions`}>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <span style={{ width: `${earned / PART_POINTS * 100}%`, backgroundColor: color }} />
          <span style={{ width: `${links / PART_POINTS * 100}%`, backgroundImage: 'repeating-linear-gradient(45deg,#d1d5db 0 3px,#e5e7eb 3px 6px)' }} />
          <span style={{ width: `${issues / PART_POINTS * 100}%`, backgroundColor: '#e11d48' }} />
        </div>
        <ul className="mt-1.5 grid grid-cols-3 gap-1 text-[10.5px] leading-tight text-gray-600">
          <li><span className="mr-1 inline-block size-2 rounded-full align-middle" style={{ backgroundColor: color }} />Earned <b className="block text-[12px] text-[#0b0f3d]">{formatPoints(earned)}</b></li>
          <li><span className="mr-1 inline-block size-2 rounded-full bg-gray-300 align-middle" />Loose links <b className="block text-[12px] text-[#0b0f3d]">−{formatPoints(links)}</b></li>
          <li><span className="mr-1 inline-block size-2 rounded-full bg-rose-600 align-middle" />Contradictions <b className="block text-[12px] text-[#0b0f3d]">−{formatPoints(issues)}</b></li>
        </ul>
      </div>
      <ul className="mt-2.5 space-y-1.5">
        <li><b className="text-[#0b0f3d]">Link strength:</b> {baseline >= 99.5
          ? 'your sections lead into each other very well, so no points were lost here.'
          : <>your sections lead into each other at <b>{Math.round(baseline)}%</b> for this part, so <b>{formatPoints(links)}</b> of the 25 points were lost.</>}</li>
        <li><b className="text-[#0b0f3d]">Contradictions:</b> {entry.deductions?.length
          ? <>the AI review quoted {entry.deductions.length === 1 ? 'one' : entry.deductions.length}, costing <b>{formatPoints(issues)}</b> points.</>
          : 'none the AI review could quote, so nothing was taken off.'}</li>
      </ul>
      {!!entry.deductions?.length && <ul className="mt-1.5 space-y-0.5 rounded-lg bg-rose-50 p-2">
        {entry.deductions.map((item, index) => <li key={index} className="flex items-start justify-between gap-2">
          <span className="min-w-0 capitalize">{item.section_a} ↔ {item.section_b} <span className="normal-case text-gray-500">({item.severity})</span></span>
          <span className="shrink-0 font-semibold tabular-nums text-rose-700">−{formatPoints(toPoints(item.points))}</span>
        </li>)}
      </ul>}
      {weakest.length > 0 && <div className="mt-2">
        <p className="font-semibold text-[#0b0f3d]">Weakest links behind this score</p>
        <ul className="mt-1 space-y-0.5">{weakest.map(pair => <li key={pair.order} className="flex items-start justify-between gap-2">
          <span className="min-w-0 capitalize">{pair.section_a} ↔ {pair.section_b}</span>
          <span className="shrink-0 font-semibold tabular-nums text-gray-700">{percent(pair.scores[scoreKey] as number)}</span>
        </li>)}</ul>
        <p className="mt-1 text-gray-500">Making these sections talk about the same things raises this part.</p>
      </div>}
      {clickable && <p className="mt-2 font-semibold text-[#1a1fcc]">Click the box to read each issue with its quotes.</p>}
    </>;
  }

  return <div role="tooltip" style={{ position: 'fixed', left, width: 312, ...position }} className="z-50 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3.5 text-xs leading-snug text-gray-700 shadow-xl">
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-sm font-bold text-[#0b0f3d]">{label}</p>
      {applicable && <p className="shrink-0 text-sm font-bold tabular-nums text-[#0b0f3d]">{formatPoints(toPoints(entry.score as number))}<span className="text-xs font-semibold text-gray-400"> / {PART_POINTS}</span></p>}
    </div>
    <p className="mt-0.5 text-gray-500">{description}</p>
    {body}
  </div>;
}
