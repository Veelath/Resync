import { Fragment, useEffect, useState } from 'react';
import type { DimensionBreakdown, DimensionKey, DimensionName, V7ScanResponse } from '../../services/v7Result';
import { categoryColors } from './categoryColors';
import { PartTooltip, formatPercent } from './PartTooltip';
import type { Placement } from '../../lib/placement';
import { PairIssueCard, isRateLimited, provisionalMessage, type RecommendationItem, type Severity } from './RecommendationsList';

export const DIMENSIONS: { name: DimensionName; key: DimensionKey; label: string; color: string; description: string }[] = [
  { name: 'context_alignment', key: 'objectives_alignment', label: 'Context Alignment', color: categoryColors.objectives.color, description: 'How well the text stays aligned with the purpose and context the paper sets up.' },
  { name: 'operational_alignment', key: 'methodology_fit', label: 'Operational Alignment', color: categoryColors.methodology.color, description: 'How well how the work was done matches the rest of the paper.' },
  { name: 'logical_support', key: 'claim_support', label: 'Logical Support', color: categoryColors.claims.color, description: 'How well statements are backed up by the surrounding text.' },
  { name: 'evidence_consistency', key: 'numeric_consistency', label: 'Evidence Consistency', color: categoryColors.numeric.color, description: 'How well numbers and data agree across the paper.' },
];

// Each of the four parts owns a quarter of the ring, filled in proportion to its score.
const RING_QUARTER = 21.5;

// Reports saved before the traced breakdown only have raw averages: show them, without issue counts.
export function breakdownOf(result: V7ScanResponse): DimensionBreakdown {
  const saved = result.dimension_breakdown ?? result.score_breakdown.dimension_breakdown;
  if (saved) return saved;
  const legacy = {} as DimensionBreakdown;
  for (const { name, key } of DIMENSIONS) {
    const average = result.score_breakdown.dimensions[key];
    legacy[name] = { score: average == null ? 'N/A' : Math.round(average * 100), penalty: 0 };
  }
  return legacy;
}

export function ResultsScorePanel({ result, large = false, items = [], linkedIds, onShowInManuscript, onShowPlacement, revealId = null, hideBreakdown = false }: {
  result: V7ScanResponse;
  large?: boolean;
  items?: RecommendationItem[];
  linkedIds?: Set<string>;
  onShowInManuscript?: (id: string) => void;
  onShowPlacement?: (section: string, placement: Placement, sentence?: string) => void;
  revealId?: string | null;
  /** While one finding is open the score boxes step aside. */
  hideBreakdown?: boolean;
}) {
  const breakdown = breakdownOf(result);
  const overall = Math.round(result.overall_coherence_score);
  const band = result.score_breakdown.band.toLowerCase().replace(/^./, letter => letter.toUpperCase());
  const [openName, setOpenName] = useState<DimensionName | null>(null);
  // Hovering or focusing a box explains where its score came from. It is drawn with fixed position so the scrolling
  // side panel cannot clip it.
  const [tip, setTip] = useState<{ name: DimensionName; rect: DOMRect } | null>(null);
  const open = DIMENSIONS.find(dimension => dimension.name === openName) ?? null;
  // Weak pairs the AI review could not judge (severity is null, not just missing from an older report).
  const unreviewed = result.manuscript_flow.filter(pair => pair.severity === null && pair.scores.overall_coherence != null).length;

  useEffect(() => {
    if (!openName) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpenName(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openName]);

  // Exactly the pairs whose issue was charged to this dimension: the full trace behind its score.
  const tracedPairs = open
    ? result.manuscript_flow.filter(pair => pair.failed_dimension === open.key && pair.severity && pair.severity !== 'None')
    : [];

  return (
    <div className={`rp-score relative flex flex-col gap-3.5 ${large ? 'rp-score-large' : ''}`}>
      <div className="rp-hero" role="img" aria-label={`Coherence score: ${overall} out of 100, ${band}${unreviewed > 0 ? ', provisional' : ''}`}>
        <div className="rp-ring" aria-hidden="true">
          <svg width="128" height="128" viewBox="0 0 100 100">
            {DIMENSIONS.map(({ name, color }, index) => {
              const entry = breakdown[name].score;
              const fill = typeof entry === 'number' ? Math.max(0, Math.min(100, entry)) / 100 * RING_QUARTER : 0;
              const start = -88 + index * 90;
              return <Fragment key={name}>
                <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeOpacity="0.3" strokeWidth="9" strokeLinecap="round" pathLength="100" strokeDasharray={`${RING_QUARTER} 100`} transform={`rotate(${start} 50 50)`} />
                {fill > 0 && <circle className="rp-arc" style={{ ['--l' as string]: fill, animationDelay: `${0.3 + index * 0.18}s` }} cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" pathLength="100" strokeDasharray={`${fill} 100`} transform={`rotate(${start} 50 50)`} />}
              </Fragment>;
            })}
          </svg>
          <div className="rp-ring-center" style={{ ['--n' as string]: overall }}><b /><small>/100</small></div>
        </div>
        <div className="rp-hero-text">
          {unreviewed > 0 && <span className="rp-badge">Provisional</span>}
          <span className="rp-hero-title">Overall coherence score</span>
          <span className="rp-hero-sub">{band}. Average of the four categories, rounded up.</span>
        </div>
      </div>
      {unreviewed > 0 && <p className="rp-note"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8v.01" /></svg><span>{isRateLimited(result.ai_synthesis?.review_status)
        ? provisionalMessage
        : `This score is provisional: ${unreviewed} section ${unreviewed === 1 ? 'pair' : 'pairs'} could not be reviewed, so ${unreviewed === 1 ? 'it is' : 'they are'} not counted. Scan again to retry.`}</span></p>}
      {!hideBreakdown && <div className="w-full space-y-2" aria-label="Score breakdown">
        <p className="rp-label">Breakdown of your total score</p>
        <div className="grid grid-cols-2 gap-2.5">
          {DIMENSIONS.map(({ name, label, color, description }) => {
            const entry = breakdown[name];
            const applicable = entry.score !== 'N/A';
            const value = applicable ? entry.score as number : 0;
            const issues = entry.issues;
            const canOpen = applicable && !!issues && !!onShowInManuscript;
            const caption = applicable ? null : name === 'evidence_consistency' ? 'No figures to compare' : 'Not enough text';
            const checks = applicable && entry.items != null && entry.passed != null
              ? ((entry.halves ?? (entry.flow?.items && entry.cross?.items)) ? `Flow ${entry.flow.passed}/${entry.flow.items} · Chapters ${entry.cross.passed}/${entry.cross.items}` : `${entry.passed} out of ${entry.items} correct`) : null;
            const title = `${description} ${applicable ? `${formatPercent(value)} percent${checks ? `, ${checks}` : ''}.` : 'Not applicable.'}`;
            return <div key={name} tabIndex={0} onMouseEnter={event => setTip({ name, rect: event.currentTarget.getBoundingClientRect() })} onFocus={event => setTip({ name, rect: event.currentTarget.getBoundingClientRect() })} onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}
              className="rp-card min-w-0 outline-none" role="group" aria-label={`${label}: ${applicable ? `${formatPercent(value)} percent` : 'Not applicable'}. ${title}`}>
              <div className="flex flex-col gap-1 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <span className={`mt-1 size-2 shrink-0 rounded-full ${applicable ? '' : 'bg-gray-300'}`} style={applicable ? { backgroundColor: color } : undefined} aria-hidden="true" />
                  <span className="min-w-0 leading-tight">{label}</span>
                </div>
                <span className="font-bold tabular-nums text-[#0b0f3d]">{applicable ? <>{formatPercent(value)}<span className="text-xs font-semibold text-gray-400">%</span></> : 'Not applicable'}</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-valuetext={applicable ? `${formatPercent(value)} percent` : 'Not applicable'}>
                <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: applicable ? color : undefined }} />
              </div>
              {checks && <p className="mt-1.5 text-[11px] text-gray-500">{checks}</p>}
              {caption && <p className="mt-2 text-[11px] text-gray-500">{caption}</p>}
              {applicable && !!issues && (canOpen
                ? <button type="button" onClick={() => setOpenName(name)} className="mt-2 text-left text-[11px] font-semibold leading-snug text-[#1a1fcc] underline focus-visible:outline-2 focus-visible:outline-offset-2">{issues} {issues === 1 ? 'issue' : 'issues'} detected. Click to view.</button>
                : <p className="mt-2 text-[11px] text-gray-600">{issues} {issues === 1 ? 'issue' : 'issues'} detected.</p>)}
            </div>;
          })}
        </div>
      </div>}
      {tip && (() => {
        const dimension = DIMENSIONS.find(item => item.name === tip.name)!;
        const entry = breakdown[tip.name];
        return <PartTooltip label={dimension.label} description={dimension.description} color={dimension.color} name={dimension.name} entry={entry} rect={tip.rect}
          clickable={entry.score !== 'N/A' && !!entry.issues && !!onShowInManuscript} />;
      })()}
      {open && onShowInManuscript && <div role="dialog" aria-modal="true" aria-label={`${open.label} issues`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenName(null)}>
        <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl" onClick={event => event.stopPropagation()}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#0b0f3d]">{open.label}</h2>
              <p className="text-xs text-gray-600">{open.description} {tracedPairs.length} {tracedPairs.length === 1 ? 'issue' : 'issues'} lowered this score.</p>
            </div>
            <button type="button" autoFocus onClick={() => setOpenName(null)} aria-label="Close" className="shrink-0 rounded-md px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2">Close</button>
          </div>
          <div className="space-y-3">
            {tracedPairs.map(pair => <Fragment key={pair.order}><PairIssueCard pair={pair} items={items.filter(item => item.pair === pair.order)} severity={pair.severity as Severity}
              linkedIds={linkedIds ?? new Set<string>()} revealId={revealId} onShowInManuscript={id => { setOpenName(null); onShowInManuscript(id); }}
              onShowPlacement={onShowPlacement && ((section, placement, sentence) => { setOpenName(null); onShowPlacement(section, placement, sentence); })} /></Fragment>)}
            {!tracedPairs.length && <p className="text-sm text-gray-500">No issues are recorded for this part.</p>}
          </div>
        </div>
      </div>}
    </div>
  );
}
