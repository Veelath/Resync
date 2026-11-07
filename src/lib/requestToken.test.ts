import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequestToken } from './requestToken';
test('removing or replacing a source invalidates pending work', () => {
  const token = createRequestToken(); const old = token.current();
  token.invalidate(); assert.equal(old(), false); const current = token.current(); assert.equal(current(), true);
  token.invalidate(); assert.equal(current(), false);
});
