import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { INITIAL_ELEMENTS, MAX_ELEMENTS, nextBudget, trimDocument } from '../../lib/docxPreview';
import { lockedHeadingAction, lockedHeadingIndex } from './lockedHeading';

for (const [name, section, expectedBudget] of [
  ['CLOUIE-THERESE-AGERO_7857_Full_Manuscript_SCITURA.docx', 'Rationale of the Study', 150],
  ['RESYNC- UPDATED.docx', 'Introduction', 1200],
] as const) {
  const path = `D:/RESYNC_DOCS/${name}`;
  test(`offline lock heading: ${name}`, { skip: !existsSync(path) }, async () => {
    const zip = await JSZip.loadAsync(readFileSync(path));
    const xml = await zip.file('word/document.xml')!.async('string');
    let budget = INITIAL_ELEMENTS;
    for (;;) {
      const trimmed = trimDocument(xml, budget);
      const doc = new DOMParser().parseFromString(trimmed.xml, 'application/xml');
      const paragraphs = Array.from(doc.getElementsByTagName('w:p')).filter(p => {
        for (let node = p.parentNode; node; node = node.parentNode) if (node.nodeName === 'w:tbl') return false;
        return true;
      }).map(p => Array.from(p.getElementsByTagName('w:t')).map(text => text.textContent ?? '').join(''));
      const index = lockedHeadingIndex(paragraphs, section);
      const action = lockedHeadingAction(index, trimmed.truncated, budget);
      if (action === 'show') break;
      assert.equal(action, 'retry', `heading not found at budget ${budget}`);
      assert.ok(budget < MAX_ELEMENTS);
      budget = nextBudget(budget);
    }
    console.log(`${name}: heading found at budget ${budget}`);
    assert.equal(budget, expectedBudget);
  });
}
