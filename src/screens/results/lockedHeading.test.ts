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

test('the table of contents is skipped, and a heading that shares its paragraph is found', () => {
  const prose = 'The study explains the problem in detail and why it matters to the people who are affected by it every day, with examples.';
  const paragraphs = ['Table of Contents', 'Introduction', 'CHAPTER II REVIEW OF RELATED LITERATURE AND STUDIES', 'List of Figures', 'Figure 1', prose, 'Introduction', prose,
    'REVIEW OF RELATED LITERATURE AND STUDIES Theoretical Background', prose];
  assert.equal(lockedHeadingIndex(paragraphs, 'review of related literature and studies'), 8);
});
