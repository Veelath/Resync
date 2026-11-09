import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordOutlineReady, googleOutlineReady } from './uploadReadiness';

test('a Word file can be scanned only after its outline succeeds', () => {
  assert.equal(wordOutlineReady(false, null, true), true);
  assert.equal(wordOutlineReady(true, null, true), false);
  assert.equal(wordOutlineReady(false, 'failed', true), false);
  assert.equal(wordOutlineReady(false, null, false), false);
});


test('a Google document must be fetched and have a successful outline', () => {
  assert.equal(googleOutlineReady('ready', false, null, true), true);
  for (const state of ['idle', 'loading', 'failed']) assert.equal(googleOutlineReady(state, false, null, true), false);
  assert.equal(googleOutlineReady('ready', true, null, true), false);
  assert.equal(googleOutlineReady('ready', false, 'failed', true), false);
  assert.equal(googleOutlineReady('ready', false, null, false), false);
});
