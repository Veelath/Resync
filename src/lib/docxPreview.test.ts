import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { trimDocument, nextBudget, preparePreview, canShowWordPreview, createPreviewGuard, previewAction, MAX_ELEMENTS } from './docxPreview';

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

test('keeps a document whose body holds a table of contents control and bookmarks', () => {
  const contents = '<w:sdt><w:sdtContent>' + p('Table of Contents') + '</w:sdtContent></w:sdt>';
  const body = '<w:bookmarkStart w:id="0"/>' + contents + p('Chapter one') + '<w:bookmarkEnd w:id="0"/>';
  const result = trimDocument(wrap(body), 150);
  assert.equal(result.truncated, false);
  assert.ok(result.xml.includes(contents));
  assert.ok(result.xml.includes('Chapter one'));
});

test('bounds text and rejects malformed or oversized first elements', () => {
  assert.equal(trimDocument(wrap(p('a'.repeat(40000)) + p('b'.repeat(30000))), 150).truncated, true);
  assert.throws(() => trimDocument(wrap(p('x'.repeat(60001))), 150));
  assert.throws(() => trimDocument('broken', 150));
});

test('show more doubles and stops at the hard limit', () => {
  assert.equal(nextBudget(150), 300);
  assert.equal(nextBudget(1200), 2400);
  assert.equal(nextBudget(MAX_ELEMENTS), MAX_ELEMENTS);
});

test('generated archive retains formatting and replaces large media without inflating it', async () => {
  const original = new JSZip();
  original.file('word/document.xml', wrap(p('one') + p('two')));
  original.file('word/styles.xml', '<styles>font</styles>');
  original.file('word/media/small.png', new Uint8Array(10));
  original.file('word/media/large.png', new Uint8Array(4_000_001));
  original.file('word/media/photo.png', new Uint8Array(900_000));
  const zip = await JSZip.loadAsync(await original.generateAsync({ type: 'uint8array' }));
  const result = await preparePreview(zip, await zip.file('word/document.xml')!.async('string'), 1);
  const view = await JSZip.loadAsync(result.bytes);
  assert.equal(result.truncated, true);
  assert.equal(await view.file('word/styles.xml')!.async('string'), '<styles>font</styles>');
  assert.equal((await view.file('word/media/small.png')!.async('uint8array')).length, 10);
  assert.ok((await view.file('word/media/large.png')!.async('uint8array')).length < 100);
  assert.equal((await view.file('word/media/photo.png')!.async('uint8array')).length, 900_000);   // an ordinary picture is shown
  assert.ok(!(await view.file('word/document.xml')!.async('string')).includes('two'));
});

test('falls back only when the current file is unavailable or failed', () => {
  const file = {} as File;
  const other = {} as File;
  assert.equal(canShowWordPreview(null, null), false);
  assert.equal(canShowWordPreview(file, file), false);
  assert.equal(canShowWordPreview(file, other), true);
});


test('render action grows only while there is budget and reports real errors', () => {
  assert.equal(previewAction(false, false, 150), 'show');
  assert.equal(previewAction(false, true, 150), 'grow');
  assert.equal(previewAction(false, true, MAX_ELEMENTS), 'show');
  assert.equal(previewAction(true, true, 150), 'fail');
});

test('guard stays active until finished or cancelled', () => {
  const guard = createPreviewGuard(() => assert.fail('unexpected timeout'));
  assert.equal(guard.finish(), true);
  assert.equal(guard.finish(), false);
  const cancelled = createPreviewGuard(() => assert.fail('unexpected timeout'));
  cancelled.cancel();
  assert.equal(cancelled.finish(), false);
});

test('aggregate media budget keeps only the first thirty megabytes', async () => {
  const original = new JSZip();
  const xml = wrap(p('text'));
  original.file('word/document.xml', xml);
  for (let i = 0; i < 8; i++) original.file(`word/media/${i}.png`, new Uint8Array(3_900_000));
  const zip = await JSZip.loadAsync(await original.generateAsync({ type: 'uint8array' }));
  const result = await preparePreview(zip, xml, 150);
  const view = await JSZip.loadAsync(result.bytes);
  assert.equal((await view.file('word/media/6.png')!.async('uint8array')).length, 3_900_000);
  assert.ok((await view.file('word/media/7.png')!.async('uint8array')).length < 100);
});

test('larger budgets retain a large element and following content', () => {
  const large = '<w:tbl>' + '<w:tr/>'.repeat(44000) + '</w:tbl>';
  const xml = wrap(p('before') + large + p('after'));
  const initial = trimDocument(xml, 150);
  const maximum = trimDocument(xml, 1500);
  assert.equal(initial.truncated, true);
  assert.ok(!initial.xml.includes('after'));
  assert.equal(maximum.truncated, false);
  assert.ok(maximum.xml.includes(large));
  assert.ok(maximum.xml.includes('after'));
});
