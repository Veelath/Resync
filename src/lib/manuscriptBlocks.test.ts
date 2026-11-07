import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { manuscriptBlocks, sectionHeading, hasTableHeader } from './manuscriptBlocks';

test('pads ragged rows and coerces cells', () => {
  assert.deepEqual(manuscriptBlocks({ blocks: [{ type: 'table', rows: [[1, null, false], ['x'], null] }] }), [{ type: 'table', rows: [['1', '', 'false'], ['x', '', ''], ['', '', '']] }]);
});
test('limits table dimensions and cell length', () => {
  const result = manuscriptBlocks({ blocks: [{ type: 'table', rows: Array.from({ length: 201 }, () => Array(21).fill('x'.repeat(501))) }] });
  assert.ok(result?.[0].type === 'table');
  assert.equal(result[0].rows.length, 200); assert.equal(result[0].rows[0].length, 20); assert.equal(result[0].rows[0][0].length, 500); assert.ok(result[0].rows[0][0].endsWith('…'));
});
test('ignores unknown blocks and preserves paragraphs', () => {
  assert.deepEqual(manuscriptBlocks({ blocks: [null, { type: 'image' }, { type: 'paragraph', text: 'Hello' }] }), [{ type: 'paragraph', text: 'Hello' }]);
});
test('missing blocks use legacy text', () => { assert.equal(manuscriptBlocks({}), null); assert.equal(manuscriptBlocks({ blocks: null }), null); });
test('heading keeps display casing and falls back only for nullish values', () => { assert.equal(sectionHeading({ name: 'intro', display_name: 'InTro!' }), 'InTro!'); assert.equal(sectionHeading({ name: 'intro' }), 'intro'); assert.equal(sectionHeading({ name: 'intro', display_name: '' }), ''); });
test('header detection is conservative', () => { assert.equal(hasTableHeader([['Page', 'Title'], ['40', 'Plan']]), true); assert.equal(hasTableHeader([['40', 'Plan'], ['45', 'Other']]), false); });
