import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropManuscriptFile, keepManuscriptFile, manuscriptFileFor, tagManuscriptFile, manuscriptFits } from './manuscriptFile';

const file = { name: 'a.docx' } as File;

test('the kept file is only offered to the scan it was sent for', () => {
  keepManuscriptFile(file);
  assert.equal(manuscriptFileFor('scan-1'), null);
  tagManuscriptFile('scan-1');
  assert.equal(manuscriptFileFor('scan-1'), file);
  assert.equal(manuscriptFileFor('scan-2'), null);
});

test('a new scan replaces it and dropping removes it', () => {
  keepManuscriptFile(file); tagManuscriptFile('scan-1');
  keepManuscriptFile({ name: 'b.docx' } as File);
  assert.equal(manuscriptFileFor('scan-1'), null);
  dropManuscriptFile();
  tagManuscriptFile('scan-2');
  assert.equal(manuscriptFileFor('scan-2'), null);
});

test('session storage limit counts encoded characters as two bytes', () => {
  assert.equal(manuscriptFits('x'.repeat(2 * 1024 * 1024)), true);
  assert.equal(manuscriptFits('x'.repeat(2 * 1024 * 1024 + 1)), false);
});

test('small files are stored for the tab and large files stay in memory', async () => {
  const { File: NodeFile } = await import('node:buffer');
  const values = new Map<string, string>();
  const storage = { removeItem: (key: string) => values.delete(key), setItem: (key: string, value: string) => values.set(key, value) };
  Object.defineProperty(globalThis, 'sessionStorage', { value: storage, configurable: true });
  const small = new NodeFile(['hello'], 'small.docx', { type: 'application/test' }) as unknown as File;
  keepManuscriptFile(small); tagManuscriptFile('small-scan');
  await new Promise(resolve => setTimeout(resolve, 20));
  const saved = JSON.parse(values.get('resync-manuscript-copy')!);
  assert.equal(saved.scanId, 'small-scan');
  assert.equal(saved.name, 'small.docx');
  assert.equal(saved.type, 'application/test');
  assert.equal(saved.data, 'aGVsbG8=');
  const large = new NodeFile([new Uint8Array(2 * 1024 * 1024)], 'large.docx') as unknown as File;
  keepManuscriptFile(large); tagManuscriptFile('large-scan');
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(values.size, 0);
  assert.equal(manuscriptFileFor('large-scan'), large);
  dropManuscriptFile();
  delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
});
