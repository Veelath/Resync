import { ScoreRing } from '../../components/AppScoreRing';
import type { DimensionKey, V7ScanResponse } from '../../services/v7Result';

const dimensions: { key: DimensionKey; label: string; color: string; description: string }[] = [
  { key: 'objectives_alignment', label: 'Objectives', color: 'bg-amber-500', description: 'How well neighboring sections support the stated objectives.' },
  { key: 'methodology_fit', label: 'Methodology', color: 'bg-emerald-500', description: 'How well the method connects to the neighboring sections.' },
  { key: 'claim_support', label: 'Claims', color: 'bg-rose-500', description: 'How well claims are supported by neighboring sections.' },
  { key: 'numeric_consistency', label: 'Numeric', color: 'bg-blue-500', description: 'How well figures agree across neighboring sections.' },
];

export function ResultsScorePanel({ result }: { result: V7ScanResponse }) {
  const weights = result.score_breakdown.dimension_weights;

  return (
    <div className="relative px-5 pt-6 pb-4 border-b border-gray-100 flex flex-col items-center gap-2.5">
      <ScoreRing score={result.overall_coherence_score} size={88} band={result.score_breakdown.band} solidArc />
      <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">Coherence Score</p>
      <p className="text-xs text-gray-500 text-center">Four equal parts; a part that does not apply is left out.</p>
      <div className="w-full mt-2 space-y-2" aria-label="Result summary">
        <div className="grid grid-cols-2 gap-2">
          {dimensions.map(({ key, label, color, description }) => {
            const average = result.score_breakdown.dimensions[key];
            const weight = weights?.[key];
            const applicable = average != null && weight !== 0;
            const value = applicable ? Math.round(average * 100) : 0;
            const caption = applicable ? (weight == null ? null : `counts ${Math.round(weight * 100)}%`)
              : key === 'numeric_consistency' ? 'no figures to compare' : 'not enough text';
            const title = `${description} ${applicable ? `Average ${value}%.` : 'Not applicable.'}${caption ? ` ${caption}.` : ''}`;
            return <div key={key} className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-3" role="group" aria-label={`${label}: ${applicable ? `${value}%` : 'Not applicable'}. ${title}`} title={title}>
              <div className="flex items-start gap-2 text-xs text-gray-700">
                <span className={`mt-1 size-2 shrink-0 rounded-full ${applicable ? color : 'bg-gray-300'}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 leading-tight">{label}</span>
                <span className="font-bold tabular-nums text-gray-900">{applicable ? `${value}%` : 'Not applicable'}</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-valuetext={applicable ? `${value}%` : 'Not applicable'}>
                <div className={`h-full rounded-full ${applicable ? color : 'bg-gray-300'}`} style={{ width: `${value}%` }} />
              </div>
              {caption && <p className="mt-2 text-[11px] text-gray-500">{caption}</p>}
            </div>;
          })}
        </div>
      </div>
    </div>
  );
}
