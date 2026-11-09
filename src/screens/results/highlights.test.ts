import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import type { V7Recommendation } from '../../services/v7Result';
import { matchedRecommendations, recommendationRanges } from './highlights';

test('finds each recommendation passage using its section and pair', () => {
  const sections = [
    { name: 'Related Literature', text: 'First paragraph has enough words. Last paragraph has enough words.' },
    { name: 'Related Studies', text: 'Beginning paragraph has enough words. Final paragraph has enough words.' },
  ];
  const base: V7Recommendation = { recommendation_id: 'same', section_a: sections[0].name, section_b: sections[1].name, pair_order: 1, original_sentence: null, recommendation_text: '', recommended_revision: '', recommendation_priority: 'Medium' };
  const items = matchedRecommendations(sections, [
    { ...base, section: '2.1 RELATED LITERATURE', kind: 'add', placement: 'end' },
    { ...base, section: '3.1 RELATED STUDIES', kind: 'add', placement: 'start', pair_order: 2 },
  ]);
  const first = recommendationRanges(sections[0], items);
  const second = recommendationRanges(sections[1], items);
  assert.equal(sections[0].text.slice(first[0].start, first[0].end), 'Last paragraph has enough words.');
  assert.equal(sections[1].text.slice(second[0].start, second[0].end), 'Beginning paragraph has enough words.');
  assert.equal(first[0].pair, 1);
  assert.equal(second[0].pair, 2);
});
