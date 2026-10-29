import type { ManuscriptFlowPair } from '../../services/v7Result';

// One rule for highlights, legend and recommendation cards: a pair at or above this score is only partly aligned.
export const PARTLY_ALIGNED_THRESHOLD = 0.65;

export const alignmentTones = {
  partial: { label: 'Partly aligned', description: 'This sentence connects to the next section, but not fully.', verdict: 'are only partly aligned', color: '#1a1fcc', tint: '#dbe4ff', ink: '#111760', bar: 'border-l-[#1a1fcc]' },
  not: { label: 'Not aligned', description: 'This sentence does not match what the next section says.', verdict: 'are not aligned', color: '#e11d48', tint: '#ffe4e6', ink: '#881337', bar: 'border-l-rose-600' },
} as const;

export function alignmentOf(pair?: ManuscriptFlowPair) {
  const overall = pair?.scores.overall_coherence;
  return overall != null && overall >= PARTLY_ALIGNED_THRESHOLD ? alignmentTones.partial : alignmentTones.not;
}
