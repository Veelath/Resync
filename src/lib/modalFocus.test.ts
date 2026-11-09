import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modalTabTarget } from './modalFocus';

test('tab wraps inside the dialog and recovers focus from outside', () => {
  assert.equal(modalTabTarget(0, 2, true), 1);
  assert.equal(modalTabTarget(1, 2, false), 0);
  assert.equal(modalTabTarget(-1, 2, false), 0);
  assert.equal(modalTabTarget(-1, 2, true), 1);
  assert.equal(modalTabTarget(0, 2, false), null);
  assert.equal(modalTabTarget(-1, 0, false), -1);
});
