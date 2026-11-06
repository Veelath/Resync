import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { backoffMs, waitState, notFoundIsFinal, queueText, isLongRunning, failureTitle, shouldNotifyFailure, canResume, isDocx, safeScanMessage, MAX_POLL_MS, withRequestTimeout, rememberFailureNotification } from './scanWait';
test('backoff caps at thirty seconds', () => assert.deepEqual([1,2,3,4,5].map(backoffMs), [5000,10000,20000,30000,30000]));
test('unreachable is information and ceiling stops polling', () => { assert.equal(waitState(600000, 0, 0), 'unreachable'); assert.equal(waitState(MAX_POLL_MS, 0, 0), 'ceiling'); });
test('404 has a sixty second grace period', () => { assert.equal(notFoundIsFinal(59999, 0), false); assert.equal(notFoundIsFinal(60000, 0), true); });
test('queue estimate rounds up and may be absent', () => { assert.equal(queueText(2, 61), 'Your scan is number 2 in line. About 2 minutes before it starts. This is an estimate.'); assert.equal(queueText(1, null), 'Your scan is number 1 in line.'); });
test('long threshold uses size, default and server elapsed', () => { assert.equal(isLongRunning(299999, 5000), false); assert.equal(isLongRunning(300000, 5000), true); assert.equal(isLongRunning(479999), false); assert.equal(isLongRunning(480000), true); assert.equal(isLongRunning(1000, null, 480), true); });
test('failure titles include fallback', () => { assert.equal(failureTitle('interrupted'), 'Scan interrupted'); assert.equal(failureTitle('timeout'), 'Scan stopped'); assert.equal(failureTitle('refused'), 'Document not accepted'); assert.equal(failureTitle('error'), 'Scan could not be finished'); assert.equal(failureTitle(), 'Scan could not be finished'); });
test('failure notification is once per scan', () => { assert.equal(shouldNotifyFailure([{kind:'error', scanId:'a'}], 'a'), false); assert.equal(shouldNotifyFailure([{kind:'success', scanId:'a'}], 'a'), true); });
test('recovery requires unexpired matching scan', () => { assert.equal(canResume({id:'a',at:0,userId:'u'}, 'u', MAX_POLL_MS - 1), true); assert.equal(canResume({id:'a',at:0,userId:'u'}, 'u', MAX_POLL_MS), false); assert.equal(canResume({id:'a',at:0,userId:'v'}, 'u', 1), false); });
test('accepts only docx extensions case insensitively', () => { assert.equal(isDocx('Paper.DOCX'), true); assert.equal(isDocx('Paper.doc'), false); assert.equal(isDocx('Paper.pdf'), false); });
test('hides technical legacy messages and scan numbers', () => { assert.equal(safeScanMessage('ValueError: failed'), ''); assert.equal(safeScanMessage('HTTP 500'), ''); assert.equal(safeScanMessage('the job may still be running'), ''); assert.equal(safeScanMessage('We could not finish this scan. Please try again. If it keeps happening, tell us this scan number: 12345678.'), 'We could not finish this scan. Please try again.'); });
test('recovery rejects missing and future scan records', () => { assert.equal(canResume(null, 'u', 1), false); assert.equal(canResume({id:'a',at:2,userId:'u'}, 'u', 1), false); });

test('filters technical legacy details while retaining safe messages', () => { for (const value of ['500 Internal Server Error', 'ValueError without colon', 'request failed', 'database unavailable', 'foo_bar', 'Traceback in main.py:42', 'https://example.com', '123e4567-e89b-12d3-a456-426614174000']) assert.equal(safeScanMessage(value), ''); assert.equal(safeScanMessage('This scan was interrupted because our server restarted. Nothing was charged. Please start it again.'), 'This scan was interrupted because our server restarted. Nothing was charged. Please start it again.'); });
test('request timeout aborts a never resolving auth header', async () => {
  const controller = new AbortController();
  await assert.rejects(withRequestTimeout(() => new Promise<never>(() => {}), controller, 10));
  assert.equal(controller.signal.aborted, true);
});
test('failure ledger deduplicates by user and expires old entries', () => {
  let data = '';
  const storage = { getItem: () => data || null, setItem: (_key: string, value: string) => { data = value; } };
  const now = 40 * 24 * 60 * 60 * 1000;
  assert.equal(rememberFailureNotification(storage, 'a', 'scan', now), true);
  assert.equal(rememberFailureNotification(storage, 'a', 'scan', now + 1), false);
  assert.equal(rememberFailureNotification(storage, 'b', 'scan', now + 1), true);
  assert.equal(rememberFailureNotification(storage, 'a', 'scan', now + 30 * 24 * 60 * 60 * 1000), true);
  for (let i = 0; i < 205; i++) rememberFailureNotification(storage, 'a', String(i), now + 30 * 24 * 60 * 60 * 1000);
  assert.equal(JSON.parse(data).length, 200);
  assert.equal(rememberFailureNotification({ getItem() { throw new Error('blocked'); }, setItem() {} }, 'a', 'x', now), true);
});
