import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discardLeftoverReport, forgetOpenReport, leftoverReport, rememberOpenReport } from './openReport';

const store = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } };

test('a report left open by an earlier visit is deleted when Resync opens again', async () => {
  store.clear();
  rememberOpenReport('scan-1');
  const deleted: string[] = [];
  await discardLeftoverReport(null, async id => { deleted.push(id); });
  assert.deepEqual(deleted, ['scan-1']);
  assert.equal(leftoverReport(null), null);
});

test('refreshing the report that is open does not delete it', async () => {
  store.clear();
  rememberOpenReport('scan-1');
  const deleted: string[] = [];
  await discardLeftoverReport('scan-1', async id => { deleted.push(id); });
  assert.deepEqual(deleted, []);
});

test('a report that was left normally is forgotten and nothing is deleted later', async () => {
  store.clear();
  rememberOpenReport('scan-1');
  forgetOpenReport();
  const deleted: string[] = [];
  await discardLeftoverReport(null, async id => { deleted.push(id); });
  assert.deepEqual(deleted, []);
});
