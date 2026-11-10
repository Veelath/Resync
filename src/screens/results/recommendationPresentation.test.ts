import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionDisplayName, severityRank, usablePair } from './recommendationPresentation';
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
