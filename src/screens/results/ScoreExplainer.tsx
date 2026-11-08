import { useEffect } from 'react';
import type { DimensionBreakdown, DimensionName } from '../../services/v7Result';

type Entry = DimensionBreakdown[DimensionName];
type Kind = 'flow' | 'cross';

export const formatPercent = (value: number) => String(Number(value.toFixed(2)));
export const formatPoints = (value: number) => String(Number(value.toFixed(2)));

/**
 * Every category checks the same two kinds of section pairs, but asks a different question about each, so each category names its
 * own two groups. `flow` = pairs of neighboring sections, `cross` = pairs far apart. Evidence only counts pairs that hold numbers.
 */
type Group = { name: string; where: string; ask: string; pass: string; lose: string };
const NEIGHBORS = 'the pairs of sections that sit side by side (like Introduction → Literature). Each section is paired with the one right after it.';
const FAR_APART = 'the pairs of sections that are far apart but should still match (like Objectives vs. Conclusion).';
const NEIGHBORS_NUMBERS = 'the side-by-side section pairs where both sections contain numbers (like Methods → Results). Pairs without numbers are skipped.';
const FAR_NUMBERS = 'the far-apart section pairs where both sections contain numbers (like Abstract vs. Results). Pairs without numbers are skipped.';
export const GROUPS: Record<DimensionName, Record<Kind, Group>> = {
  context_alignment: {
    flow: { name: 'Transitions', where: NEIGHBORS,
      ask: 'Does the next section continue the same topic and goals as the section before it, instead of jumping to something unrelated?',
      pass: 'the Introduction ends on your research problem and the Literature section starts with studies about that same problem.',
      lose: 'the Literature section suddenly talks about a different topic.' },
    cross: { name: 'Cross-Sections', where: FAR_APART,
      ask: 'Does the later section still serve the purpose and goals set at the start, even with many pages in between?',
      pass: 'the Conclusion answers the goals listed in the Introduction.',
      lose: 'the Conclusion talks about goals that were never stated.' },
  },
  operational_alignment: {
    flow: { name: 'Method flow', where: NEIGHBORS,
      ask: 'Does each section keep using the same methods, tools and steps that the section before it described?',
      pass: 'Methods says a survey was given to 96 students and Results starts by reporting that survey.',
      lose: 'Results reports interviews that Methods never mentions.' },
    cross: { name: 'Method match', where: FAR_APART,
      ask: 'Does the method described early on match what is later reported as done and found?',
      pass: 'the design announced in the Introduction is the one used in Methods and reported in Results.',
      lose: 'the Introduction promises an experiment but the Results show only a survey.' },
  },
  logical_support: {
    flow: { name: 'Reasoning flow', where: NEIGHBORS,
      ask: 'Does each section lead sensibly into the next one, so a reader can follow the argument step by step?',
      pass: 'Results ends with the main finding and Discussion begins by explaining that finding.',
      lose: 'Discussion jumps to a claim that has nothing to do with the results.' },
    cross: { name: 'Claim backing', where: FAR_APART,
      ask: 'Are the claims made later (like in the Conclusion) supported by the evidence given earlier?',
      pass: 'the Conclusion says scores improved and the Results show exactly that.',
      lose: 'the Conclusion claims something the Results never showed.' },
  },
  evidence_consistency: {
    flow: { name: 'Number carry-over', where: NEIGHBORS_NUMBERS,
      ask: 'Do the numbers stay the same when one section hands over to the next?',
      pass: 'Methods says 96 students and Results analyzes those 96 (or explains the dropouts).',
      lose: 'Results suddenly says 69 students with no reason.' },
    cross: { name: 'Number match', where: FAR_NUMBERS,
      ask: 'Do numbers mentioned in sections far apart agree with each other?',
      pass: 'the Abstract reports a 25% improvement and Results shows 25%.',
      lose: 'the Abstract says 25% but Results shows 15%.' },
  },
};
export const groupName = (name: DimensionName, kind: Kind) => GROUPS[name][kind].name;

/** What every single check earned: 1 = a full point, 0 to 1 = part of a point, null = unknown (older report). Full points first. */
export function checksOf(entry: Entry, kind: Kind): (number | null)[] {
  const half = entry[kind];
  if (!half) return [];
  const partial = (entry.failures ?? []).filter(item => item.kind === kind).map(item => item.credit ?? 0).sort((a, b) => b - a);
  const list: (number | null)[] = [...Array(half.passed).fill(1), ...partial];
  while (list.length < half.items) list.push(null);
  return list.slice(0, half.items);
}

const dotClass = (credit: number | null) => credit === null ? 'bg-gray-300' : credit >= 1 ? 'bg-emerald-500' : credit > 0 ? 'bg-amber-400' : 'bg-rose-500';
const dotWord = (credit: number | null) => credit === null ? 'earned an unknown amount' : credit >= 1 ? 'earned a full point' : credit > 0 ? `earned ${formatPoints(credit)} of a point` : 'earned no points';

/** One little square per check, so the score can be seen instead of read. */
export function CheckDots({ checks, size = 'md' }: { checks: (number | null)[]; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'size-2.5' : 'size-3.5';
  return <span className="flex flex-wrap gap-[3px]" role="img" aria-label={`${checks.length} checks: ${checks.filter(c => c === 1).length} full points`}>
    {checks.map((credit, index) => <span key={index} title={`Check ${index + 1} ${dotWord(credit)}`} className={`${box} rounded-[3px] ${dotClass(credit)}`} />)}
  </span>;
}

export function DotLegend({ unknown = false }: { unknown?: boolean }) {
  return <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
    <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-emerald-500" />full point (1)</span>
    <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-amber-400" />part of a point</span>
    <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-rose-500" />no point (0)</span>
    {unknown && <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-gray-300" />got part of a point (amount not saved)</span>}
  </p>;
}

/** One bar for a group of checks: the whole bar is every point that could be earned. Green = earned as full points, yellow = earned as part points, empty = lost. */
export function HalfBar({ name, entry, kind, slim = false }: { name: DimensionName; entry: Entry; kind: Kind; slim?: boolean }) {
  const half = entry[kind];
  if (!half || !half.items) return null;
  const full = half.passed / half.items * 100;
  const part = half.credit != null ? Math.max(0, half.credit - half.passed) / half.items * 100 : 0;
  const unknown = half.credit == null ? 100 - full : 0;
  return <div className={`flex w-full overflow-hidden rounded-full bg-gray-100 ${slim ? 'h-2.5' : 'h-4'}`} role="img"
    aria-label={`${groupName(name, kind)}: ${half.passed} of ${half.items} got the full point${half.credit != null ? `, ${formatPoints(half.credit)} points earned` : ''}`}>
    <div className="h-full bg-emerald-500" style={{ width: `${full}%` }} />
    {part > 0 && <div className="h-full bg-amber-400" style={{ width: `${part}%` }} />}
    {unknown > 0 && <div className="h-full bg-gray-300" style={{ width: `${unknown}%`, backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 4px, rgba(255,255,255,.7) 4px 7px)' }} />}
  </div>;
}

/** The colours used by the bars. */
export function BarLegend({ unknown = false }: { unknown?: boolean }) {
  return <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
    <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-emerald-500" />full points</span>
    {!unknown && <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-amber-400" />part points</span>}
    <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm border border-gray-300 bg-gray-100" />points lost</span>
    {unknown && <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-gray-300" />part or lost (split not saved)</span>}
  </p>;
}

/** Click-through story of exactly how one category score was made, in plain words and pictures. */
export function ScoreExplainer({ name, label, description, color, entry, onClose }: { name: DimensionName; label: string; description: string; color: string; entry: Entry; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const score = entry.score as number;
  const kinds = (['flow', 'cross'] as Kind[]).filter(kind => (entry[kind]?.items ?? 0) > 0);
  const detailed = kinds.every(kind => entry[kind]?.credit != null);
  const rates = kinds.map(kind => (entry[kind]!.credit ?? entry[kind]!.passed) / entry[kind]!.items * 100);
  const WHERE: Record<Kind, (n: number) => string> = {
    flow: n => `${n} = every pair of neighboring sections in your manuscript (a section and the one right after it).`,
    cross: n => `${n} = the far-apart pairs that should still agree (e.g., Objectives vs. Conclusion).`,
  };

  return <div role="dialog" aria-modal="true" aria-label={`How the ${label} score was made`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
    <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 text-[13.5px] leading-relaxed text-gray-700 shadow-xl" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#0b0f3d]"><span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ backgroundColor: color }} />{label}: {formatPercent(score)}%</h2>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <button type="button" autoFocus onClick={onClose} aria-label="Close" className="shrink-0 rounded-md px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2">Close</button>
      </div>
      <div className="mt-3"><BarLegend unknown={!detailed} /></div>

      {kinds.map(kind => {
        const half = entry[kind]!;
        return <section key={kind} className="mt-5">
          <p className="text-[15px] font-bold text-[#0b0f3d]">{groupName(name, kind)}: {half.passed} of {half.items}</p>
          <div className="mt-2"><HalfBar name={name} entry={entry} kind={kind} /></div>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li><b>{half.items}</b> = {GROUPS[name][kind].where}</li>
            <li><b>What we check:</b> {GROUPS[name][kind].ask}</li>
            <li><b className="text-emerald-700">Full point</b> when {GROUPS[name][kind].pass} <b className="text-rose-700">Loses points</b> when {GROUPS[name][kind].lose}</li>
            <li><b>{half.passed}</b> of them are correct (full point).{half.credit != null ? ` The others still earned part of a point, so together they earned ${formatPoints(half.credit)} of ${half.items} points = ${formatPercent(half.credit / half.items * 100)}%.` : ''}</li>
          </ul>
        </section>;
      })}

      <section className="mt-5 rounded-xl bg-[#f6f7fb] p-3.5">
        <p className="font-bold text-[#0b0f3d]">Putting it together</p>
        <p className="mt-1 text-[15px] font-extrabold text-[#0b0f3d]">Score = ½ × {groupName(name, 'flow')} + ½ × {groupName(name, 'cross')}</p>
        {kinds.length === 2 && detailed && <p className="mt-1 font-semibold tabular-nums text-[#0b0f3d]">= ½ × {formatPercent(rates[0])}% + ½ × {formatPercent(rates[1])}% = {formatPercent(score)}%</p>}
        {kinds.length === 2 && !detailed && (() => {
          const base = Number(((rates[0] + rates[1]) / 2).toFixed(2));
          const extra = Number((score - base).toFixed(2));
          return <div className="mt-2 space-y-1.5 text-[13px]">
            <p className="font-semibold text-[#0b0f3d]">Step 1: perfect checks only</p>
            <div className="flex items-baseline justify-between rounded-lg bg-white px-3 py-1.5"><span>{groupName(name, 'flow')}</span><b className="tabular-nums text-[#0b0f3d]">{entry.flow!.passed} perfect out of {entry.flow!.items} = {formatPercent(rates[0])}%</b></div>
            <div className="flex items-baseline justify-between rounded-lg bg-white px-3 py-1.5"><span>{groupName(name, 'cross')}</span><b className="tabular-nums text-[#0b0f3d]">{entry.cross!.passed} perfect out of {entry.cross!.items} = {formatPercent(rates[1])}%</b></div>
            <p className="tabular-nums">Average of the two = <b className="text-[#0b0f3d]">{formatPercent(base)}%</b></p>
            <p className="pt-1 font-semibold text-[#0b0f3d]">Step 2: add the bonus</p>
            <p>Some checks were not perfect but still earned part of a point. That adds <b className="tabular-nums text-[#0b0f3d]">+{formatPercent(extra)}%</b>.</p>
            <p className="text-[15px] font-extrabold tabular-nums text-[#0b0f3d]">{formatPercent(base)}% + {formatPercent(extra)}% = {formatPercent(score)}%</p>
            <p className="text-xs text-gray-500">Older report: only the total bonus was saved. Scan again to see it for each group.</p>
          </div>;
        })()}
        {kinds.length === 1 && <p className="mt-1 font-semibold">Only {groupName(name, kinds[0])} checks exist here, so Score = {formatPercent(score)}%.</p>}
        <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-gray-200" role="img" aria-label={`Score ${formatPercent(score)} percent`}>
          <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
        </div>
        {!!entry.estimated && <p className="mt-2 text-xs text-amber-900">{entry.estimated} {entry.estimated === 1 ? 'check uses' : 'checks use'} the model rating only (AI review unfinished).</p>}
      </section>
    </div>
  </div>;
}
