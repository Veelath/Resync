import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearAllSourceFiles } from './sourceFile';
test('clearing source files tolerates unavailable IndexedDB', async () => {
  await assert.doesNotReject(clearAllSourceFiles());
});
