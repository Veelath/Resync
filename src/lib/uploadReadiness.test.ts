import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordOutlineReady } from './uploadReadiness';

test('a Word file can be scanned only after its outline succeeds', () => {
  assert.equal(wordOutlineReady(false, null, true), true);
  assert.equal(wordOutlineReady(true, null, true), false);
  assert.equal(wordOutlineReady(false, 'failed', true), false);
  assert.equal(wordOutlineReady(false, null, false), false);
});
