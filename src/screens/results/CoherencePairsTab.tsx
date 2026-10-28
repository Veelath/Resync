import type { ManuscriptFlowPair } from '../../services/v7Result';

const dimensions = [
  ['objectives_alignment', 'Objectives alignment'],
  ['methodology_fit', 'Methodology fit'],
  ['numeric_consistency', 'Numeric consistency'],
  ['claim_support', 'Claim support'],
  ['overall_coherence', 'Overall coherence'],
] as const;

export function PairScores({ pair }: { pair: ManuscriptFlowPair }) {
  if (pair.skipped_reason) return <p className="text-xs text-amber-800">Skipped: {pair.skipped_reason}</p>;
  return <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
    {dimensions.map(([key, label]) => <p key={key}>{label}: <strong>{pair.scores[key] == null ? '—' : `${Math.round(pair.scores[key] * 100)}/100`}</strong></p>)}
    <p>Pair weight: <strong>{pair.pair_weight == null ? '—' : pair.pair_weight.toFixed(2)}</strong></p>
  </div>;
}

export function CoherencePairsTab({ pairs, activePairKey, onSelect, onExplain }: {
  pairs: ManuscriptFlowPair[];
  activePairKey: string | null;
  onSelect: (order: string) => void;
  onExplain: () => void;
}) {
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">Coherence pairs ({pairs.length})</p>
      <button type="button" onClick={onExplain} className="text-xs font-bold text-indigo-600 hover:underline">How pairing works</button>
    </div>
    {pairs.length === 0 && <p className="text-sm text-gray-500">No neighboring section pairs to show.</p>}
    {pairs.map(pair => <button key={pair.order} type="button" onClick={() => onSelect(String(pair.order))}
      className={`w-full text-left rounded-2xl border p-5 space-y-3 hover:border-indigo-300 ${activePairKey === String(pair.order) ? 'border-indigo-400 ring-2 ring-indigo-300' : 'border-gray-200'}`}>
      <p className="text-sm font-bold text-gray-900">{pair.section_a} → {pair.section_b}</p>
      <PairScores pair={pair} />
    </button>)}
  </div>;
}
