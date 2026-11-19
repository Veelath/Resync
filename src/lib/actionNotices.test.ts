import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOTICE_EVENT, notify } from './notify';
import { discardLeftoverReport, leftoverReport, rememberOpenReport } from './openReport';

test('notify dispatches the requested notice', () => {
  const target = new EventTarget();
  (globalThis as any).window = target;
  const notice = { kind: 'error' as const, title: "Couldn't copy", message: 'Select the sentence and copy it yourself.' };
  let received: unknown;
  target.addEventListener(NOTICE_EVENT, event => { received = (event as CustomEvent).detail; });
  notify(notice);
  assert.deepEqual(received, notice);
});

test('failed report deletion is retried on the next visit', async () => {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value), removeItem: (key: string) => store.delete(key) };
  rememberOpenReport('scan-1');
  await discardLeftoverReport(null, async () => false);
  assert.equal(leftoverReport(null), 'scan-1');
  await discardLeftoverReport(null, async () => true);
  assert.equal(leftoverReport(null), null);
});
