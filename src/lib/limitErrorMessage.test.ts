import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limitErrorMessage } from './limitErrorMessage';
test('limit errors use a plain server message or a safe fallback', () => {
  assert.equal(limitErrorMessage({ detail: 'Please try again.' }), 'Please try again.');
  assert.equal(limitErrorMessage({ detail: [{ msg: 'bad' }] }), 'We could not start this scan. Please try again.');
  assert.equal(limitErrorMessage({ detail: '{"code":413}' }), 'We could not start this scan. Please try again.');
});
