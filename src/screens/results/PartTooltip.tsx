import type { ReactNode } from 'react';
import type { DimensionBreakdown, DimensionName } from '../../services/v7Result';

/** A category percentage with at most two decimals and no trailing zeros: 97.78, 100, 65.5. */
export const formatPercent = (value: number) => String(Number(value.toFixed(2)));

/**
 * The explanation shown when a score box is hovered or focused: how many of the category's checks passed, one dot per
 * check, and exactly which ones failed and why. It is drawn with fixed position so the scrolling side panel cannot clip it.
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
  const left = Math.min(Math.max(8, rect.left + rect.width / 2 - 144), window.innerWidth - 304);
  // Open on whichever side has more room and never taller than that room, scrolling inside if the explanation is long.
  const roomBelow = window.innerHeight - rect.bottom - 16;
  const roomAbove = rect.top - 16;
  const below = roomBelow >= 380 || roomBelow >= roomAbove;
  const position = below ? { top: rect.bottom + 8, maxHeight: roomBelow } : { bottom: window.innerHeight - rect.top + 8, maxHeight: roomAbove };

  const SHOWN = 3;
  let body: ReactNode;
  if (!applicable) {
    body = <p className="mt-2">{name === 'evidence_consistency'
      ? 'Your paper has no numbers to compare, so this category is skipped.'
      : 'There was not enough text to check this category, so it is skipped.'}</p>;
  } else if (entry.items == null || entry.passed == null) {
    // A report saved before checks were counted.
    body = <p className="mt-2">This report was scored with an older method. Scan again to see how this score was made.</p>;
  } else {
    const failures = entry.failures ?? [];
    body = <>
      <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-200" role="img" aria-label={`${entry.passed} out of ${entry.items} correct`}>
        <div className="h-full rounded-full" style={{ width: `${entry.passed / entry.items * 100}%`, backgroundColor: color }} />
      </div>
      <p className="mt-1.5 text-[13px] font-semibold text-[#0b0f3d]">{entry.passed} out of {entry.items} correct <span className="font-normal text-gray-500">· {formatPercent(entry.score as number)}%</span></p>
      <p className="text-gray-500">{name === 'evidence_consistency' ? 'Counts the pairs of sections that both contain numbers.' : 'Counts each pair of sections in your paper once.'}</p>
      {failures.length > 0
        ? <div className="mt-2">
            <p className="font-semibold text-[#0b0f3d]">Why not 100%?</p>
            <ul className="mt-1 space-y-1.5">{failures.slice(0, SHOWN).map((item, index) => <li key={index} className="flex gap-1.5">
              <span aria-hidden="true" className={`mt-1.5 size-1.5 shrink-0 rounded-full ${item.reason === 'contradiction' ? 'bg-rose-600' : 'bg-gray-400'}`} />
              <span><b className="capitalize text-[#0b0f3d]">{item.section_a}</b> and <b className="capitalize text-[#0b0f3d]">{item.section_b}</b> {item.reason === 'contradiction'
                ? `disagree${item.severity ? ` (${item.severity.toLowerCase()})` : ''}.`
                : 'do not connect well.'}</span>
            </li>)}</ul>
            {failures.length > SHOWN && <p className="mt-1 text-gray-500">and {failures.length - SHOWN} more.</p>}
          </div>
        : <p className="mt-2 font-semibold text-emerald-700">Everything checked out here.</p>}
      {clickable && <p className="mt-2 font-semibold text-[#1a1fcc]">Click the box to see the details.</p>}
    </>;
  }

  return <div role="tooltip" style={{ position: 'fixed', left, width: 288, ...position }} className="z-50 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3.5 text-xs leading-snug text-gray-700 shadow-xl">
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-sm font-bold text-[#0b0f3d]">{label}</p>
      {applicable && <p className="shrink-0 text-sm font-bold tabular-nums text-[#0b0f3d]">{formatPercent(entry.score as number)}%</p>}
    </div>
    <p className="mt-0.5 text-gray-500">{description}</p>
    {body}
  </div>;
}
