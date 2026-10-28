import { ScoreRing } from '../../components/AppScoreRing';

export function ResultsScorePanel({ score, displayBand, advisoryDimensions }: { score: number; displayBand?: string; advisoryDimensions: Array<{ key: string; label: string; color: string; value: number | null }> }) {
  return (
          <div className="relative px-5 pt-6 pb-4 border-b border-gray-100 flex flex-col items-center gap-2.5">
            <ScoreRing score={score} size={88} band={displayBand} solidArc />
            <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">Coherence Score</p>
              <div className="w-full mt-2 space-y-2" aria-label="Coherence dimensions">
                <div className="grid grid-cols-2 gap-2">
                {advisoryDimensions.map(({ key, label, color, value }) => (
                  <div key={key} className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-3">
                    <div className="flex items-start gap-2 text-xs text-gray-700">
                      <span className={`mt-1 size-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1 leading-tight">{label}</span>
                      <span className="font-bold tabular-nums text-gray-900">{value === null ? '—' : `${Math.round(value * 100)}%`}</span>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden" role={value === null ? undefined : 'progressbar'} aria-label={label} aria-valuenow={value === null ? undefined : Math.round(value * 100)} aria-valuemin={value === null ? undefined : 0} aria-valuemax={value === null ? undefined : 100}>
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${(value ?? 0) * 100}%` }} />
                    </div>
                  </div>
                ))}
                </div>
              </div>
          </div>
  );
}
