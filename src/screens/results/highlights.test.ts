import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommendationRanges } from './highlights';

const text = 'The study begins here with a clear aim. It then describes the survey tool in some detail. Results follow in the next section of the paper.';
const base = { section_a: 'methods', section_b: 'results', pair_order: 1, kind: 'add', recommended_revision: 'x' } as never;

test('a new sentence is shown by highlighting the sentence it goes right after', () => {
  const ranges = recommendationRanges({ name: 'methods', text }, [{ ...(base as object), id: 'a1', recommendation_id: 'a1', section: 'methods', placement: 'end', original_sentence: null }] as never);
  assert.equal(ranges.length, 1);
  assert.equal(text.slice(ranges[0].start, ranges[0].end), 'Results follow in the next section of the paper.');
});

test('a sentence added at the start is shown by the first sentence', () => {
  const ranges = recommendationRanges({ name: 'methods', text }, [{ ...(base as object), id: 'a2', recommendation_id: 'a2', section: 'methods', placement: 'start', original_sentence: null }] as never);
  assert.equal(text.slice(ranges[0].start, ranges[0].end), 'The study begins here with a clear aim.');
});

test('an edit is still shown by its own sentence and another section gets nothing', () => {
  const edit = { ...(base as object), id: 'e1', recommendation_id: 'e1', kind: 'edit', section: 'methods', original_sentence: 'It then describes the survey tool in some detail.' };
  assert.equal(text.slice(recommendationRanges({ name: 'methods', text }, [edit] as never)[0].start).startsWith('It then describes'), true);
  assert.deepEqual(recommendationRanges({ name: 'results', text }, [edit] as never), []);
});
