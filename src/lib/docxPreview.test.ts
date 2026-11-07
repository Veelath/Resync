import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { trimDocument, nextBudget, preparePreview, canShowWordPreview } from './docxPreview';

const wrap = (body: string) => `<w:document xmlns:w="word"><w:body>${body}<w:sectPr><w:pgSz/></w:sectPr></w:body></w:document>`;
const p = (text: string) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;

test('trims at whole elements and keeps the final section', () => {
  const table = '<w:tbl><w:tr><w:tc>' + p('cell') + '</w:tc></w:tr></w:tbl>';
  const result = trimDocument(wrap(p('one') + table + p('three')), 2);
  assert.equal(result.truncated, true);
  assert.ok(result.xml.includes(table));
  assert.ok(result.xml.includes('<w:sectPr>'));
  assert.ok(!result.xml.includes('three'));
  assert.equal(trimDocument(wrap(p('one')), 150).truncated, false);
});

test('bounds text and rejects malformed or oversized first elements', () => {
  assert.equal(trimDocument(wrap(p('a'.repeat(40000)) + p('b'.repeat(30000))), 150).truncated, true);
  assert.throws(() => trimDocument(wrap(p('x'.repeat(60001))), 150));
  assert.throws(() => trimDocument('broken', 150));
});

test('show more doubles and stops at the hard limit', () => {
  assert.equal(nextBudget(150), 300);
  assert.equal(nextBudget(1200), 1500);
  assert.equal(nextBudget(1500), 1500);
});

test('generated archive retains formatting and replaces large media without inflating it', async () => {
  const original = new JSZip();
  original.file('word/document.xml', wrap(p('one') + p('two')));
  original.file('word/styles.xml', '<styles>font</styles>');
  original.file('word/media/small.png', new Uint8Array(10));
  original.file('word/media/large.png', new Uint8Array(300001));
  const zip = await JSZip.loadAsync(await original.generateAsync({ type: 'uint8array' }));
  const result = await preparePreview(zip, await zip.file('word/document.xml')!.async('string'), 1);
  const view = await JSZip.loadAsync(result.bytes);
  assert.equal(result.truncated, true);
  assert.equal(await view.file('word/styles.xml')!.async('string'), '<styles>font</styles>');
  assert.equal((await view.file('word/media/small.png')!.async('uint8array')).length, 10);
  assert.ok((await view.file('word/media/large.png')!.async('uint8array')).length < 100);
  assert.ok(!(await view.file('word/document.xml')!.async('string')).includes('two'));
});

test('falls back only when the current file is unavailable or failed', () => {
  const file = {} as File;
  const other = {} as File;
  assert.equal(canShowWordPreview(null, null), false);
  assert.equal(canShowWordPreview(file, file), false);
  assert.equal(canShowWordPreview(file, other), true);
});
