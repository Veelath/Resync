import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldRetryWordView } from './wordViewRetry';

test('retry the Word view only when the report becomes unlocked', () => {
  assert.equal(shouldRetryWordView(true, false), true);
  assert.equal(shouldRetryWordView(true, true), false);
  assert.equal(shouldRetryWordView(false, false), false);
  assert.equal(shouldRetryWordView(false, true), false);
});
