#!/usr/bin/env node
// Runnable self-check for the Revision Plan math in src/utils.ts
// (computeRevisionPlan). Re-implements the coherence-fix formula in plain
// JS so it runs with zero dependencies -- this project has no ts-node/tsx.
// Keep this in sync by hand if the formula in utils.ts changes.
import assert from 'node:assert/strict';

const WEIGHTS = { structural: 0.25, coherence: 0.50, citation: 0.25 };
const PAR_TARGET = 80;

function normWeight(active, key) {
  const activeWeightSum = Object.entries(active)
    .filter(([, on]) => on)
    .reduce((sum, [k]) => sum + WEIGHTS[k], 0) || 1;
  return active[key] ? WEIGHTS[key] / activeWeightSum : 0;
}

function coherenceGains(pairs, active) {
  const included = pairs.filter((p) => p.included);
  const totalWeight = included.reduce((s, p) => s + p.weight, 0);
  if (totalWeight === 0) return [];
  return included
    .filter((p) => (p.score ?? 0) < PAR_TARGET)
    .map((p) => {
      const deltaSub = (p.weight * (PAR_TARGET - (p.score ?? 0))) / totalWeight;
      return normWeight(active, 'coherence') * deltaSub;
    });
}

const ALL_ACTIVE = { structural: true, coherence: true, citation: true };

// --- an empty pair list yields no items, no NaN -----------------------------
{
  const gains = coherenceGains([], ALL_ACTIVE);
  assert.deepEqual(gains, [], 'empty pair list should yield no revision items');
}

// --- an inactive criterion is excluded and the rest renormalize
//     (mirrors scoring.py's active_weight_sum renormalization) -------------
{
  const active = { structural: true, coherence: true, citation: false };
  const w = normWeight(active, 'coherence');
  const expected = WEIGHTS.coherence / (WEIGHTS.structural + WEIGHTS.coherence);
  assert.ok(Math.abs(w - expected) < 1e-9, `renormalized coherence weight should be ${expected}, got ${w}`);
}

// --- a single weak pair's gain matches the closed-form formula, and can't
//     exceed the coherence criterion's own weight share --------------------
{
  const pairs = [{ role_a: 'methodology', role_b: 'results', weight: 0.20, included: true, score: 50 }];
  const gains = coherenceGains(pairs, ALL_ACTIVE);
  assert.equal(gains.length, 1);
  const expected = normWeight(ALL_ACTIVE, 'coherence') * (0.20 * (PAR_TARGET - 50) / 0.20);
  assert.ok(Math.abs(gains[0] - expected) < 1e-9, `gain should be ${expected}, got ${gains[0]}`);
  assert.ok(gains[0] <= WEIGHTS.coherence * 100, 'a single fix cannot exceed the coherence weight share');
}

// --- gains across multiple pairs sum to a weighted total, not double-count --
{
  const pairs = [
    { role_a: 'a', role_b: 'b', weight: 0.20, included: true, score: 40 },
    { role_a: 'c', role_b: 'd', weight: 0.20, included: true, score: 60 },
  ];
  const gains = coherenceGains(pairs, ALL_ACTIVE);
  const totalDeltaSub = gains.reduce((s, g) => s + g, 0) / normWeight(ALL_ACTIVE, 'coherence');
  const expectedDeltaSub = (0.20 * (PAR_TARGET - 40) + 0.20 * (PAR_TARGET - 60)) / 0.40;
  assert.ok(Math.abs(totalDeltaSub - expectedDeltaSub) < 1e-9, 'summed sub-score deltas should match the weighted-mean formula');
}

// --- a pair already at or above PAR_TARGET contributes nothing -------------
{
  const pairs = [{ role_a: 'a', role_b: 'b', weight: 0.5, included: true, score: 95 }];
  assert.equal(coherenceGains(pairs, ALL_ACTIVE).length, 0, 'a pair already above PAR_TARGET should not appear in the plan');
}

console.log('check-revision-plan: all assertions passed.');
