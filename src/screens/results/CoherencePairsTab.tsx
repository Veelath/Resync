import type { ManuscriptFlowPair } from '../../services/v7Result';
import { DIMENSION_LABELS, FAIR_THRESHOLD, plainText, STRENGTH_THRESHOLD } from './helpers';

export function PairScores({ pair }: { pair: ManuscriptFlowPair }) {
  if (pair.skipped_reason) return <p className="text-xs text-amber-800">Skipped: {pair.skipped_reason}</p>;
  return <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
    {(Object.entries(DIMENSION_LABELS) as [keyof typeof DIMENSION_LABELS, string][]).map(([key, label]) =>
      <p key={key}>{label}: <strong>{pair.scores[key] == null ? '—' : `${Math.round(pair.scores[key]! * 100)}%`}</strong></p>)}
    <p className="col-span-2">How much this pair counts toward the score: <strong>{pair.pair_weight == null ? '—' : pair.pair_weight.toFixed(2)}</strong></p>
  </div>;
}

export function CoherencePairsTab({ pairs, onExplain }: {
  pairs: ManuscriptFlowPair[];
  onExplain: () => void;
}) {
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">Coherence pairs ({pairs.length})</p>
      <button type="button" onClick={onExplain} className="text-xs font-bold text-indigo-600 hover:underline">How pairing works</button>
    </div>
    {pairs.length === 0 && <p className="text-sm text-gray-500">No neighboring section pairs to show.</p>}
    {pairs.map(pair => {
      const score = pair.scores.overall_coherence == null ? null : pair.scores.overall_coherence * 100;
      const verdict = score == null ? null : score >= STRENGTH_THRESHOLD ? 'Strong connection' : score >= FAIR_THRESHOLD ? 'Fair connection' : 'Weak connection';
      const explanation = pair.explanation?.highlighted_inconsistencies.find(item => item.what)?.what
        || pair.explanation?.highlighted_inconsistencies.find(item => item.why)?.why;
      const sentence = explanation ? plainText(explanation) : verdict === 'Strong connection' ? 'These sections connect well.'
        : verdict === 'Fair connection' ? 'These sections connect only partly.' : 'These sections do not connect clearly.';
      return <article key={pair.order} className="rounded-2xl border border-gray-200 p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-900">{pair.section_a} → {pair.section_b}</h3>
        {pair.skipped_reason ? <PairScores pair={pair} /> : <>
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${verdict === 'Strong connection' ? 'bg-emerald-50 text-emerald-800' : verdict === 'Fair connection' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800'}`}>{verdict}</span>
          <p className="text-xs text-gray-700">{sentence}</p>
          <details className="text-xs text-indigo-700"><summary className="cursor-pointer font-semibold">Show details</summary><div className="pt-3"><PairScores pair={pair} /></div></details>
        </>}
      </article>;
    })}
  </div>;
}
