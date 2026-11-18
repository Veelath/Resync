import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropManuscriptFile, keepManuscriptFile, manuscriptFileFor, tagManuscriptFile } from './manuscriptFile';

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
