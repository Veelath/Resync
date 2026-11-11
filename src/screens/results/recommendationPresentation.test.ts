import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardHeading, sectionDisplayName, severityRank, usablePair } from './recommendationPresentation';
import type { ManuscriptFlowPair } from '../../services/v7Result';

const pair = { section_a: 'literature', section_b: 'methods' } as ManuscriptFlowPair;
const sections = [{ name: 'literature', display_name: 'Review of literature', text: 'Real content.' }, { name: 'methods', text: 'Real content.' }];
test('preserves displayed names and excludes invalid section pairs', () => {
  assert.equal(sectionDisplayName('literature', sections), 'Review of literature');
  assert.equal(usablePair(pair, sections), true);
  assert.equal(usablePair({ ...pair, section_b: 'Literature' }, sections), false);
  assert.equal(usablePair(pair, [{ ...sections[0], text: '  ' }, sections[1]]), false);
  assert.equal(usablePair({ ...pair, section_a: 'CHAPTER 1' }, [{ name: 'CHAPTER 1', text: 'Methods .... 12' }, sections[1]]), false);
  assert.equal(usablePair(pair, []), true);
  assert.equal(usablePair({ ...pair, section_a: 'CHAPTER 1\nMethods .... 12' }, []), false);
  assert.equal(usablePair({ ...pair, section_a: '1. Literature', section_b: 'Literature' }, []), false);
  assert.ok(severityRank('Critical') < severityRank('Moderate') && severityRank('Moderate') < severityRank('Minor'));
});

test('card headings name both sections and distinguish pairs', () => {
  assert.equal(cardHeading('Introduction', 'Review of Related Literature', true), 'Introduction and Review of Related Literature need a clearer connection.');
  assert.equal(cardHeading('Methodology', 'Results', false), 'Methodology and Results may not agree.');
  assert.notEqual(cardHeading('Introduction', 'Methods', false), cardHeading('Introduction', 'Results', false));
});

test('formats uniformly cased section names while preserving mixed case', () => {
  assert.equal(sectionDisplayName("COMPARATIVE MATRIX SUMMARY CONT'D"), "Comparative Matrix Summary Cont'd");
  assert.equal(sectionDisplayName('COMPARATIVE MATRIX SUMMARY cont\u2019d'), 'Comparative Matrix Summary Cont\u2019d');
  assert.equal(sectionDisplayName('research methodology'), 'Research Methodology');
  assert.equal(sectionDisplayName('rationale of the study'), 'Rationale of the Study');
  assert.equal(sectionDisplayName('Rationale of the Study'), 'Rationale of the Study');
});
