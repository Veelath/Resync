import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileToData, readSavedTemplate, savedFile } from './savedTemplate';

const stored = (value: string | null) => ({ getItem: () => value });
const chapters = [{ id: 'c1', title: 'Methodology', sections: ['Research Design'] }];

test('a saved template keeps its file byte for byte', async () => {
  const bytes = new Uint8Array([0, 1, 2, 80, 75, 200, 255]);
  const fileData = await fileToData(new Blob([bytes]));
  const saved = readSavedTemplate(stored(JSON.stringify({ chapters, fileName: 'school.docx', fileData })));
  const file = savedFile(saved);
  assert.equal(file?.name, 'school.docx');
  assert.deepEqual(new Uint8Array(await file!.arrayBuffer()), bytes);
});

test('an older template without a file is still read', () => {
  const saved = readSavedTemplate(stored(JSON.stringify({ chapters, savedAt: '2026-11-01T00:00:00.000Z' })));
  assert.deepEqual(saved?.chapters, chapters);
  assert.equal(savedFile(saved), null);
});

test('nothing, or something broken, is no template', () => {
  for (const value of [null, '', 'not json', '{}', '{"chapters":"x"}', '{"chapters":[{"title":1}]}']) {
    assert.equal(readSavedTemplate(stored(value)), null);
  }
  assert.equal(savedFile({ chapters, fileName: 'x.docx', fileData: '%%%' }), null);
});
