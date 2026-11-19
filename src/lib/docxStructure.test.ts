import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { readDocxStructure } from './docxStructure';

async function docx(body: string, styles = '', numbering = ''): Promise<Blob> {
  const zip = new JSZip();
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="w"><w:body>${body}</w:body></w:document>`);
  if (styles) zip.file('word/styles.xml', `<w:styles xmlns:w="w">${styles}</w:styles>`);
  if (numbering) zip.file('word/numbering.xml', `<w:numbering xmlns:w="w">${numbering}</w:numbering>`);
  return new Blob([await zip.generateAsync({ type: 'uint8array' })]);
}

const p = (text: string, props = '', runProps = '') => `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ''}<w:r>${runProps ? `<w:rPr>${runProps}</w:rPr>` : ''}<w:t>${text}</w:t></w:r></w:p>`;

test('keeps paragraphs in order with alignment, bold, italic and size', async () => {
  const blocks = await readDocxStructure(await docx(
    p('CHAPTER I', '<w:jc w:val="center"/>', '<w:b/><w:sz w:val="28"/>') + p('Body text', '<w:jc w:val="both"/><w:ind w:firstLine="720"/>', '<w:i/>')));
  assert.equal(blocks.length, 2);
  assert.deepEqual([blocks[0].align, blocks[0].size, blocks[0].runs[0].bold, blocks[0].runs[0].text], ['center', 14, true, 'CHAPTER I']);
  assert.deepEqual([blocks[1].align, blocks[1].first, blocks[1].runs[0].italic], ['justify', 36, true]);
});

test('formatting from a style is applied, and direct formatting wins', async () => {
  const styles = '<w:style w:type="paragraph" w:styleId="Heading1"><w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>';
  const [block] = await readDocxStructure(await docx(p('Introduction', '<w:pStyle w:val="Heading1"/>'), styles));
  assert.deepEqual([block.align, block.size, block.before, block.after, block.runs[0].bold], ['center', 16, 12, 6, true]);
});

test('tables, pictures and text boxes are left out and a page break is kept', async () => {
  const blocks = await readDocxStructure(await docx(
    p('Before') + '<w:tbl><w:tr><w:tc>' + p('cell text') + '</w:tc></w:tr></w:tbl>'
    + '<w:p><w:r><w:drawing><w:txbxContent><w:p><w:r><w:t>diagram label</w:t></w:r></w:p></w:txbxContent></w:drawing></w:r></w:p>'
    + '<w:p><w:r><w:t>Page one end</w:t></w:r><w:r><w:br w:type="page"/></w:r><w:r><w:t>Page two</w:t></w:r></w:p>'));
  const text = blocks.map(block => block.kind === 'page' ? '<PAGE>' : block.runs.map(run => run.text).join(''));
  assert.deepEqual(text.filter(Boolean), ['Before', 'Page one end', '<PAGE>', 'Page two']);
  assert.ok(!text.join(' ').includes('cell text') && !text.join(' ').includes('diagram label'));
});

test('lists get their numbers and bullets', async () => {
  const numbering = '<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>'
    + '<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/></w:lvl></w:abstractNum>'
    + '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>';
  const item = (id: string, text: string) => p(text, `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${id}"/></w:numPr>`);
  const blocks = await readDocxStructure(await docx(item('1', 'one') + item('1', 'two') + item('2', 'dot'), '', numbering));
  assert.deepEqual(blocks.map(block => block.marker), ['1.', '2.', '•']);
});

test('line spacing, tabs, entities and caps', async () => {
  const [block] = await readDocxStructure(await docx(
    '<w:p><w:pPr><w:spacing w:line="480" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:caps/></w:rPr><w:t>a &amp; b</w:t></w:r><w:r><w:tab/><w:t>c</w:t></w:r></w:p>'));
  assert.equal(block.runs.map(run => run.text).join(''), 'A & B    c');
  assert.ok(block.lineFactor > 2);
});
