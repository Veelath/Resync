import test from 'node:test';
import assert from 'node:assert/strict';
import { clearPairs, allClearCount } from './clearPairs';
import type { DimensionBreakdown, ManuscriptFlowPair } from '../../services/v7Result';

const pair = (order: number, severity: ManuscriptFlowPair['severity'] = 'None') => ({ order, section_a: `section ${order}`, section_b: `section ${order + 1}`, severity, scores: { overall_coherence: 0.8 } } as ManuscriptFlowPair);
const breakdown = { context_alignment: { failures: [{ order: 1, credit: 0.5 }] } } as DimensionBreakdown;

test('separates point losses, clean pairs, and pairs with advice', () => {
  const result = clearPairs([pair(1), pair(3), pair(5, 'Minor'), pair(7)], order => order === 7, [], { ...breakdown, logical_support: { failures: [{ order: 5 }] } } as DimensionBreakdown);
  assert.deepEqual(result.clear.map(p => p.order), [3]);
  assert.deepEqual(result.small.map(row => [row.pair.order, row.categories]), [[1, ['Context Alignment']], [5, ['Logical Support']]]);
});
test('older reports retain severity behavior and server counts take precedence', () => {
  assert.deepEqual(clearPairs([pair(1), pair(3, 'Minor')], () => false).clear.map(p => p.order), [1]);
  assert.equal(allClearCount(2, false, 8, 9), 8);
  assert.equal(allClearCount(2, true, 8, 9), 9);
  assert.equal(allClearCount(2, true), 2);
});
