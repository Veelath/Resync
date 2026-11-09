import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewUnfinished } from './reviewComplete';
test('unfinished reviews cannot be unlocked', () => {
  assert.equal(reviewUnfinished({ status: 'partial', unreviewed: 0 }), true);
  assert.equal(reviewUnfinished({ status: 'daily_limit', unreviewed: 0 }), true);
  assert.equal(reviewUnfinished({ status: 'complete', unreviewed: 1 }), true);
  assert.equal(reviewUnfinished({ status: 'complete', unreviewed: 0 }), false);
  assert.equal(reviewUnfinished(undefined), false);
});
