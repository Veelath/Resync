import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { findSectionIndex, isWithheldSection } from './sectionNavigation';

test('only sections after the visible preview are withheld', () => {
  assert.equal(isWithheldSection(true, 1), true);
  assert.equal(isWithheldSection(true, 0), false);
  assert.equal(isWithheldSection(true, -1), false);
  assert.equal(isWithheldSection(false, 1), false);
});

test('matches numbered and differently spaced section names without guessing duplicates', () => {
  const names = ['Related Literature', 'Related Studies', 'Review Of Sources And Methods'];
  assert.equal(findSectionIndex(names, '2.1 RELATED LITERATURE'), 0);
  assert.equal(findSectionIndex(names, '3.1 RELATED STUDIES'), 1);
  assert.equal(findSectionIndex(names, ' REVIEW  OF SOURCES AND METHODS '), 2);
  assert.equal(findSectionIndex(names, 'missing'), -1);
  assert.equal(findSectionIndex(['2.1 Related Studies', '3.1 Related Studies'], 'Related Studies'), -1);
});
