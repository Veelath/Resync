import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageDocument, splitTable } from './docxPages';

const p = (text: string) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
const row = (text: string) => `<w:tr><w:tc>${p(text)}</w:tc></w:tr>`;
const table = (rows: string) => `<w:tbl><w:tblPr/><w:tblGrid/>${rows}</w:tbl>`;
const document = (body: string) => `<w:document><w:body>${body}<w:sectPr/></w:body></w:document>`;

test('pages retain every paragraph in source order and the page properties', () => {
  const pages = pageDocument(document(Array.from({ length: 80 }, (_, i) => p(`item-${i}-end`)).join('')));
  assert.ok(pages.length > 1);
  assert.deepEqual(pages.flatMap(page => [...page.matchAll(/item-(\d+)-end/g)].map(match => Number(match[1]))), Array.from({ length: 80 }, (_, i) => i));
  assert.ok(pages.every(page => page.includes('<w:sectPr/>')));
});

test('large tables split at rows and keep the table properties and all cell text', () => {
  const pieces = splitTable(table(Array.from({ length: 200 }, (_, i) => row(`row-${i}-end`)).join('')));
  assert.ok(pieces.length > 1);
  assert.ok(pieces.every(piece => piece.startsWith('<w:tbl><w:tblPr/><w:tblGrid/>') && piece.endsWith('</w:tbl>')));
  assert.deepEqual(pieces.flatMap(piece => [...piece.matchAll(/row-(\d+)-end/g)].map(match => Number(match[1]))), Array.from({ length: 200 }, (_, i) => i));
});

test('oversized rows and nested tables use labelled text without dropping cell text', () => {
  const pieces = splitTable(table(row('x'.repeat(21000) + '&amp;end')));
  assert.match(pieces[0], /Table too large, shown as text/);
  assert.equal(pieces.slice(1).flatMap(piece => [...piece.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(match => match[1])).join('').match(/x/g)?.length, 21000);
  assert.ok(pieces.join('').includes('&amp;end'));
  const nested = splitTable(table(row(table(row('inside'))) + row('x'.repeat(20000))));
  assert.match(nested[0], /Table too large/);
  assert.ok(nested.join('').includes('inside'));
});

test('invalid document bodies are rejected', () => {
  assert.throws(() => pageDocument('broken'));
  assert.throws(() => pageDocument('<w:document><w:body><w:p></w:body></w:document>'));
});

