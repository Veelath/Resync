import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { findSectionIndex } from './sectionNavigation';

test('matches numbered and differently spaced section names without guessing duplicates', () => {
  const names = ['Related Literature', 'Related Studies', 'Review Of Sources And Methods'];
  assert.equal(findSectionIndex(names, '2.1 RELATED LITERATURE'), 0);
  assert.equal(findSectionIndex(names, '3.1 RELATED STUDIES'), 1);
  assert.equal(findSectionIndex(names, ' REVIEW  OF SOURCES AND METHODS '), 2);
  assert.equal(findSectionIndex(names, 'missing'), -1);
  assert.equal(findSectionIndex(['2.1 Related Studies', '3.1 Related Studies'], 'Related Studies'), -1);
});
