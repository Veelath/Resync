import type { ReactNode } from 'react';
import type { DimensionBreakdown, DimensionName } from '../../services/v7Result';
import { BarLegend, HalfBar, formatPercent, formatPoints, groupName } from './ScoreExplainer';

export { formatPercent, formatPoints };

/**
 * The picture shown when a score box is hovered or focused: one little square per check (green = a full point, yellow = part of a
 * point, red = none), then the sum. Clicking the box opens the full step-by-step story (ScoreExplainer). It is drawn with fixed
 * position so the scrolling side panel cannot clip it.
 */
export function PartTooltip({ label, description, color, name, entry, rect, clickable }: {
  label: string;
  description: string;
  color: string;
  name: DimensionName;
  entry: DimensionBreakdown[DimensionName];
  rect: DOMRect;
  clickable: boolean;
}) {
  const applicable = entry.score !== 'N/A';
  const left = Math.min(Math.max(8, rect.left + rect.width / 2 - 160), window.innerWidth - 336);
  // Open on whichever side has more room and never taller than that room, scrolling inside if the explanation is long.
  const roomBelow = window.innerHeight - rect.bottom - 16;
  const roomAbove = rect.top - 16;
  const below = roomBelow >= 380 || roomBelow >= roomAbove;
  const position = below ? { top: rect.bottom + 8, maxHeight: roomBelow } : { bottom: window.innerHeight - rect.top + 8, maxHeight: roomAbove };

  let body: ReactNode;
  if (!applicable) {
    body = <p className="mt-2">{name === 'evidence_consistency'
      ? 'Your paper has no numbers to compare, so this category is skipped.'
      : 'There was not enough text to check this category, so it is skipped.'}</p>;
  } else if (entry.items == null || entry.passed == null) {
    // A report saved before checks were counted.
    body = <p className="mt-2">This report was scored with an older method. Scan again to see how this score was made.</p>;
  } else {
    const kinds = (['flow', 'cross'] as const).filter(kind => (entry[kind]?.items ?? 0) > 0);
    const BASIS = {
      flow: (n: number) => `The system found ${n} adjacent section connections in your manuscript.`,
      cross: (n: number) => `The system evaluated ${n} critical far-apart pairs (e.g., Objectives vs. Conclusion).`,
    };
    const exact = kinds.every(kind => entry[kind]!.credit != null);
    const pct = (kind: 'flow' | 'cross') => entry[kind]!.credit! / entry[kind]!.items * 100;
    const total = kinds.reduce((sum, kind) => sum + entry[kind]!.items, 0);
    body = <>
      <div className="mt-2"><BarLegend unknown={!exact} /></div>
      <div className="mt-2 space-y-3">
        {kinds.map(kind => {
          const half = entry[kind]!;
          const none = (entry.failures ?? []).filter(item => item.kind === kind && item.credit === 0).length;
          return <div key={kind}>
            <p className="text-[13px] font-bold text-[#0b0f3d]">{groupName(name, kind)}: {half.passed} out of {half.items}</p>
            <div className="mt-1"><HalfBar name={name} entry={entry} kind={kind} slim /></div>
            <p className="mt-1"><b>Basis:</b> {BASIS[kind](half.items)}</p>
            <p><b>Result:</b> {half.passed} got full points. The rest got partial points.{none ? ` (${none} got none.)` : ''}</p>
          </div>;
        })}
      </div>
      <div className="mt-3 rounded-lg bg-gray-50 px-2.5 py-2">
        <p className="font-bold text-[#0b0f3d]">How are these computed</p>
        <p className="mt-1 tabular-nums">Total Checks = {kinds.map(kind => entry[kind]!.items).join(' + ')}{kinds.length > 1 ? ` = ${total}` : ''}</p>
        {exact && kinds.map(kind => <p key={kind} className="tabular-nums">{groupName(name, kind)} = {formatPoints(entry[kind]!.credit!)} points ÷ {entry[kind]!.items} = {formatPercent(pct(kind))}%</p>)}
        {kinds.length === 2
          ? <p className="mt-1 font-bold tabular-nums text-[#0b0f3d]">{exact
              ? `Category Score = (${formatPercent(pct('flow'))}% + ${formatPercent(pct('cross'))}%) ÷ 2 = ${formatPercent(entry.score as number)}%`
              : `Category Score = (${groupName(name, 'flow')} % + ${groupName(name, 'cross')} %) ÷ 2 = ${formatPercent(entry.score as number)}%`}</p>
          : <p className="mt-1 font-bold tabular-nums text-[#0b0f3d]">Category Score = {formatPercent(entry.score as number)}%</p>}
        {kinds.length === 2 && <p className="text-gray-500">50/50 weighting: each group counts for half.</p>}
        {!exact && <p className="text-amber-900">Older report: part-points were not saved. Scan again to see the exact numbers.</p>}
      </div>
      {(entry.limited || !!entry.estimated) && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-900">
        {entry.limited ? 'A group has under 3 checks: one check moves the score a lot. ' : ''}
        {!!entry.estimated && `${entry.estimated} ${entry.estimated === 1 ? 'check uses' : 'checks use'} the model rating only (AI review unfinished).`}
      </p>}
      <p className="mt-2 font-semibold text-[#1a1fcc]">Click the box for the step-by-step view.</p>
    </>;
  }

  return <div role="tooltip" style={{ position: 'fixed', left, width: 320, ...position }} className="z-50 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3.5 text-xs leading-snug text-gray-700 shadow-xl">
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-sm font-bold text-[#0b0f3d]">{label}</p>
      {applicable && <p className="shrink-0 text-sm font-bold tabular-nums text-[#0b0f3d]">{formatPercent(entry.score as number)}%</p>}
    </div>
    <p className="mt-0.5 text-gray-500">{description}</p>
    {body}
  </div>;
}
