import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSignOutController } from './signOutController';
test('concurrent logout and session failures share cleanup and do not redirect twice', async () => {
  let resolve!: () => void; let calls = 0; const finished: boolean[] = [];
  const c = createSignOutController(() => { calls++; return new Promise<void>(r => { resolve = r; }); }, ended => finished.push(ended));
  const a = c.run(false); const b = c.run(true); const d = c.run(true);
  await Promise.resolve(); assert.equal(calls, 1); assert.deepEqual(finished, []);
  resolve(); await Promise.all([a, b, d]); await c.run(true);
  assert.deepEqual(finished, [false]); assert.equal(calls, 1);
  c.reset(); const next = c.run(true); await Promise.resolve(); resolve(); await next;
  assert.deepEqual(finished, [false, true]);
});

test('a cleanup failure does not navigate and can be retried', async () => {
  let attempts = 0; let navigated = false;
  const c = createSignOutController(async () => { if (++attempts === 1) throw Error('failed'); }, () => { navigated = true; });
  await assert.rejects(c.run(true)); assert.equal(navigated, false);
  await c.run(true); assert.equal(navigated, true);
});
