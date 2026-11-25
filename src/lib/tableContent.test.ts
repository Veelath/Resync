import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionHasTable, tableTexts, quotesTable } from './tableContent.ts';

const withTable = { text: 'Intro text.\nName | Score\nAnna Cruz | 90 percent', blocks: [{ type: 'paragraph', text: 'Intro text.' }, { type: 'table', rows: [['Name', 'Score'], ['Anna Cruz', '90 percent']] }] };
const plain = { text: 'Only prose here.', blocks: [{ type: 'paragraph', text: 'Only prose here.' }] };

test('a section with a table block is detected, plain prose is not', () => {
  assert.equal(sectionHasTable(withTable), true);
  assert.equal(sectionHasTable(plain), false);
});
test('older sections without blocks are detected from their pipe rows', () => {
  assert.equal(sectionHasTable({ text: 'a | b\nc | d\nsome prose' }), true);
  assert.equal(sectionHasTable({ text: 'one | two' }), false);
});
test('a finding that quotes a table row is recognised, prose is not', () => {
  const cells = tableTexts([withTable, plain]);
  assert.equal(quotesTable('Anna Cruz 90 percent', cells), true);
  assert.equal(quotesTable('Only prose here.', cells), false);
  assert.equal(quotesTable('', cells), false);
});
