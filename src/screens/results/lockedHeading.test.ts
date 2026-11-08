import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lockedHeadingIndex } from './lockedHeading';

test('finds normalized, numbered and split headings at their earliest safe boundary', () => {
  for (const heading of [' METHODOLOGY! ', '2. Methodology', '2.0 Methodology', 'II. Methodology', 'CHAPTER 2: Methodology']) {
    assert.equal(lockedHeadingIndex(['Introduction', heading, 'secret'], 'Methodology'), 1);
  }
  assert.equal(lockedHeadingIndex(['Introduction', 'CHAPTER 2', 'Methodology', 'secret'], 'Methodology'), 1);
  assert.equal(lockedHeadingIndex(['Methodology', 'Introduction', 'Methodology'], 'Methodology'), -1);
  assert.equal(lockedHeadingIndex(['Introduction', 'secret'], 'Methodology'), -1);
  assert.equal(lockedHeadingIndex(['Introduction'], ''), -1);
});
