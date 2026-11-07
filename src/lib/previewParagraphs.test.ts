import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewParagraphs } from './previewParagraphs';
test('preview caps paragraphs and characters', () => {
  assert.equal(previewParagraphs(Array(100).fill('word')).length, 60);
  assert.equal(previewParagraphs(['x'.repeat(39999), 'abc', 'later']).join('').length, 40000);
  assert.deepEqual(previewParagraphs(['one', 'two']), ['one', 'two']);
});
