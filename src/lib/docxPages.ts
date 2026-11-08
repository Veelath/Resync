// Split the Word body off the UI thread. A batch is small enough to render without drawing the whole manuscript.
const LIMIT = 20000;
const MAX_BLOCKS = 24;

function fallbackText(element: string, label: string): string[] {
  const values = [...element.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(match => match[1]);
  const chunks = [`<w:p><w:r><w:t>${label}</w:t></w:r></w:p>`];
  for (const value of values) {
    // Keep XML entities intact when a long run is split.
    const pieces = value.match(/(?:&[^;\s]{1,20};|[^&]|&(?!(?:[^;\s]{1,20});)){1,4000}/g) ?? [];
    for (const piece of pieces) chunks.push(`<w:p><w:r><w:t xml:space="preserve">${piece}</w:t></w:r></w:p>`);
  }
  return chunks;
}

export function splitTable(table: string): string[] {
  if (table.length <= LIMIT && (table.match(/<w:tr(?:\s|>)/g) ?? []).length <= 15) return [table];
  const open = /^<w:tbl(?:\s[^>]*)?>/.exec(table)?.[0];
  const first = table.search(/<w:tr(?:\s|>)/);
  const rows = [...table.matchAll(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g)].map(match => match[0]);
  const nested = (table.match(/<w:tbl(?:\s|>)/g) ?? []).length !== 1;
  if (!open || first < 0 || !rows.length || nested || rows.some(row => row.length > LIMIT)) return fallbackText(table, 'Table too large, shown as text.');
  const prefix = table.slice(0, first);
  const suffix = table.slice(table.lastIndexOf('</w:tr>') + 7);
  const groups: string[] = [];
  let group = '';
  for (const row of rows) {
    if (group && (group.length + row.length > LIMIT || (group.match(/<w:tr(?:\s|>)/g) ?? []).length >= 15)) {
      groups.push(prefix + group + suffix); group = '';
    }
    group += row;
  }
  if (group) groups.push(prefix + group + suffix);
  return groups;
}

export function pageDocument(xml: string): string[] {
  const body = /<w:body(?:\s[^>]*)?>/.exec(xml);
  const end = xml.lastIndexOf('</w:body>');
  if (!body || end < body.index) throw new Error('Invalid document body');
  const start = body.index + body[0].length;
  const content = xml.slice(start, end);
  const tags = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[^>]*\?>|<[^>]+>/g;
  let depth = 0, elementStart = 0, section = '';
  const blocks: string[] = [];
  for (const match of content.matchAll(tags)) {
    const tag = match[0];
    if (tag.startsWith('<!') || tag.startsWith('<?')) continue;
    if (!tag.startsWith('</') && depth === 0) elementStart = match.index;
    if (tag.startsWith('</')) depth--; else if (!/\/\s*>$/.test(tag)) depth++;
    if (depth < 0) throw new Error('Invalid document structure');
    if (depth !== 0) continue;
    const element = content.slice(elementStart, match.index + tag.length);
    if (/^<w:sectPr(?:\s|>|\/)/.test(element)) section = element;
    else if (/^<w:tbl(?:\s|>|\/)/.test(element)) blocks.push(...splitTable(element));
    else if (/^<w:p(?:\s|>|\/)/.test(element)) blocks.push(...(element.length > LIMIT ? fallbackText(element, 'Long paragraph, shown as text.') : [element]));
    else throw new Error('Unsupported document structure');
  }
  if (depth !== 0) throw new Error('Invalid document structure');
  const pages: string[] = [];
  let page = '', count = 0;
  const addPage = () => { pages.push(xml.slice(0, start) + page + section + xml.slice(end)); page = ''; count = 0; };
  for (const block of blocks) {
    if (page && (count >= MAX_BLOCKS || page.length + block.length > LIMIT)) addPage();
    page += block; count++;
  }
  if (page || !pages.length) addPage();
  return pages;
}
