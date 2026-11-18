import type { DimensionBreakdown, ManuscriptFlowPair } from '../../services/v7Result';
import { usablePair, type Sections } from './recommendationPresentation';

const labels = { context_alignment: 'Context Alignment', operational_alignment: 'Operational Alignment', evidence_consistency: 'Evidence Consistency', logical_support: 'Logical Support' } as const;

export function clearPairs(pairs: ManuscriptFlowPair[], hasAdvice: (order: number) => boolean, sections: Sections = [], breakdown?: DimensionBreakdown) {
  const hasFailures = breakdown && Object.values(breakdown).some(entry => Array.isArray(entry.failures));
  const clear: ManuscriptFlowPair[] = [];
  const small: { pair: ManuscriptFlowPair; categories: string[] }[] = [];
  for (const pair of pairs) {
    if (!usablePair(pair, sections) || pair.scores.overall_coherence == null || hasAdvice(pair.order)) continue;
    const categories = hasFailures ? (Object.keys(labels) as (keyof typeof labels)[]).filter(key => breakdown[key]?.failures?.some(failure => (failure.order != null ? failure.order === pair.order : failure.section_a === pair.section_a && failure.section_b === pair.section_b) && (failure.credit == null || failure.credit < 1))).map(key => labels[key]) : [];
    if (categories.length) small.push({ pair, categories });
    else if (hasFailures || pair.severity === 'None') clear.push(pair);
  }
  return { clear, small };
}

export function allClearCount(local: number, locked: boolean, display?: number, lockedCount?: number) {
  return (locked ? lockedCount : display) ?? local;
}
