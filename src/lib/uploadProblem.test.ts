import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { slimDocx } from './slimDocx';
import { isUnreadableDocument, paperProblemTitle } from './uploadProblem';

test('every "could not read" sentence gets one title and blocks a template', () => {
  for (const reason of ['this language is unsupported.', 'it is a scanned file.', 'it is a handwritten file.',
    'it contains an unsupported language and a two-column structure.']) {
    const problem = `Could not read this document because ${reason}`;
    assert.equal(isUnreadableDocument(problem), true);
    assert.equal(paperProblemTitle(problem), 'Document not supported');
  }
  assert.equal(isUnreadableDocument('This does not look like a research paper, so it was not scanned.'), false);
  assert.equal(paperProblemTitle('Could not read this document because it does not match the uploaded template: only 1 of 5.'), 'This does not match your template');
  assert.equal(paperProblemTitle('This does not look like a research paper.'), 'This does not look like a research paper');
});

async function docx(words: number): Promise<File> {
  const zip = new JSZip();
  zip.file('word/document.xml', `<w:document><w:body><w:p><w:r><w:t>${'word '.repeat(words)}</w:t></w:r></w:p></w:body></w:document>`);
  for (let index = 1; index <= 6; index++) {
    const bytes = new Uint8Array(300_000);   // random bytes, so the file stays large after compression
    for (let at = 0; at < bytes.length; at += 65_536) crypto.getRandomValues(bytes.subarray(at, at + 65_536));
    zip.file(`word/media/page${index}.png`, bytes);
  }
  return new File([await zip.generateAsync({ type: 'uint8array' })], 'paper.docx');
}

const realPictures = async (file: File) => {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const sizes = await Promise.all(Object.keys(zip.files).filter(name => name.startsWith('word/media/') && !zip.files[name].dir)
    .map(async name => (await zip.files[name].async('uint8array')).length));
  return sizes.filter(size => size > 1000).length;
};

test('a file made of pictures keeps a few of them so the server can look', async () => {
  assert.equal(await realPictures(await slimDocx(await docx(10))), 4);
});

test('a file with real writing still loses all of its pictures', async () => {
  assert.equal(await realPictures(await slimDocx(await docx(500))), 0);
});
