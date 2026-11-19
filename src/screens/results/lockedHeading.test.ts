import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lockedHeadingAction, lockedHeadingIndex } from './lockedHeading';

test('finds normalized, numbered and split headings at their earliest safe boundary', () => {
  for (const heading of [' METHODOLOGY! ', '2. Methodology', '2.0 Methodology', 'II. Methodology', 'CHAPTER 2: Methodology']) {
    assert.equal(lockedHeadingIndex(['Introduction', heading, 'secret'], 'Methodology'), 1);
  }
  assert.equal(lockedHeadingIndex(['Introduction', 'CHAPTER 2', 'Methodology', 'secret'], 'Methodology'), 1);
  assert.equal(lockedHeadingIndex(['Methodology', 'Introduction', 'Methodology'], 'Methodology'), -2);
  assert.equal(lockedHeadingIndex(['Introduction', 'secret'], 'Methodology'), -1);
  assert.equal(lockedHeadingIndex(['Introduction'], ''), -1);
});

test('the table of contents is skipped, and a heading that shares its paragraph is found', () => {
  const prose = 'The study explains the problem in detail and why it matters to the people who are affected by it every day, with examples.';
  const paragraphs = ['Table of Contents', 'Introduction', 'CHAPTER II REVIEW OF RELATED LITERATURE AND STUDIES', 'List of Figures', 'Figure 1', prose, 'Introduction', prose,
    'REVIEW OF RELATED LITERATURE AND STUDIES Theoretical Background', prose];
  assert.equal(lockedHeadingIndex(paragraphs, 'review of related literature and studies'), 8);
});

test('retries only a missing heading in a truncated preview below the limit', () => {
  assert.equal(lockedHeadingAction(0, true, 150), 'show');
  assert.equal(lockedHeadingAction(-1, true, 150), 'retry');
  assert.equal(lockedHeadingAction(-1, false, 150), 'fail');
  assert.equal(lockedHeadingAction(-1, true, 3000), 'fail');
  assert.equal(lockedHeadingAction(-2, true, 150), 'fail');
});
