import { ScoreRing } from '../../components/AppScoreRing';
import type { DimensionKey, V7ScanResponse } from '../../services/v7Result';
import { categoryColors } from './categoryColors';

const dimensions: { key: DimensionKey; label: string; color: string; description: string }[] = [
  { key: 'objectives_alignment', label: 'Context Alignment', color: categoryColors.objectives.color, description: 'How well the text stays aligned with the purpose and context the paper sets up.' },
  { key: 'methodology_fit', label: 'Operational Alignment', color: categoryColors.methodology.color, description: 'How well how the work was done matches the rest of the paper.' },
  { key: 'claim_support', label: 'Logical Support', color: categoryColors.claims.color, description: 'How well statements are backed up by the surrounding text.' },
  { key: 'numeric_consistency', label: 'Evidence Consistency', color: categoryColors.numeric.color, description: 'How well numbers and data agree across the paper.' },
];

export function ResultsScorePanel({ result, large = false }: { result: V7ScanResponse; large?: boolean }) {
  const weights = result.score_breakdown.dimension_weights;

  return (
    <div className="relative px-5 pt-6 pb-4 border-b border-gray-100 flex flex-col items-center gap-2.5">
      <ScoreRing score={result.overall_coherence_score} size={large ? 176 : 88} band={result.score_breakdown.band.toLowerCase().replace(/^./, letter => letter.toUpperCase())} label="Overall Coherence Score" solidArc />
      {!!result.score_breakdown.critical_penalty && <p className="text-xs font-semibold text-rose-700 text-center">Critical flaw: {result.score_breakdown.critical_penalty} points deducted for a pair that does not connect.</p>}
      <div className="w-full mt-2 space-y-2" aria-label="Result summary">
        <p className="text-xs font-semibold text-gray-500 text-center">Breakdown of your total score</p>
        <div className="grid grid-cols-2 gap-2">
          {dimensions.map(({ key, label, color, description }) => {
            const average = result.score_breakdown.dimensions[key];
            const weight = weights?.[key];
            const applicable = average != null && weight !== 0;
            const value = applicable ? Math.round(average * 100) : 0;
            const share = applicable && weight != null ? (average * weight * 100).toFixed(1) : null;
            const maximum = weight == null ? null : Math.round(weight * 100);
            const caption = applicable ? null : key === 'numeric_consistency' ? 'No figures to compare' : 'Not enough text';
            const title = `${description} ${applicable ? `Average ${value}%.${share ? ` Contribution ${share} of ${maximum}.` : ''}` : 'Not applicable.'}`;
            return <div key={key} className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-3" role="group" aria-label={`${label}: ${applicable ? `${value}%` : 'Not applicable'}. ${title}`} title={title}>
              <div className="flex flex-col gap-1 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                <span className={`mt-1 size-2 shrink-0 rounded-full ${applicable ? '' : 'bg-gray-300'}`} style={applicable ? { backgroundColor: color } : undefined} aria-hidden="true" />
                <span className="min-w-0 leading-tight">{label}</span>
                </div>
                <span className="font-bold tabular-nums text-[#0b0f3d]">{applicable ? share ? `${share} of ${maximum}` : `${value}%` : 'Not applicable'}</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-valuetext={applicable ? share ? `${share} of ${maximum}` : `${value}%` : 'Not applicable'}>
                <div className={`h-full rounded-full ${applicable ? '' : 'bg-gray-300'}`} style={{ width: `${value}%`, backgroundColor: applicable ? color : undefined }} />
              </div>
              {caption && <p className="mt-2 text-[11px] text-gray-500">{caption}</p>}
            </div>;
          })}
        </div>
      </div>
    </div>
  );
}
