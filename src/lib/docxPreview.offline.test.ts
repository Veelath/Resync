import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { MAX_ELEMENTS, trimDocument } from './docxPreview';

const path = 'D:/RESYNC_DOCS/RESYNC- UPDATED.docx';
test('long manuscript fits within the maximum preview budget', { skip: !existsSync(path) }, async () => {
  const zip = await JSZip.loadAsync(readFileSync(path));
  const xml = await zip.file('word/document.xml')!.async('string');
  assert.equal(trimDocument(xml, MAX_ELEMENTS).truncated, false);
});
