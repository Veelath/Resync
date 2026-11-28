import JSZip from 'jszip';

export const INITIAL_ELEMENTS = 150;
export const MAX_ELEMENTS = 8000;   // a 300-page thesis has about 3,500
export const canShowWordPreview = (file: File | null, failed: File | null) => file !== null && file !== failed;
export const nextBudget = (n: number) => Math.min(MAX_ELEMENTS, n * 2);

export function createPreviewGuard(_onTimeout: () => void) {
  let active = true;
  return {
    finish: () => { const wasActive = active; active = false; return wasActive; },
    cancel: () => { active = false; },
    isActive: () => active,
  };
}

export function previewAction(error: boolean, truncated: boolean, budget: number): 'show' | 'grow' | 'fail' {
  if (error) return 'fail';
  return truncated && budget < MAX_ELEMENTS ? 'grow' : 'show';
}

// XML is scanned in a worker; elements are never split, including tables.
export function trimDocument(xml: string, limit: number) {
  const body = /<w:body(?:\s[^>]*)?>/.exec(xml);
  const end = xml.lastIndexOf('</w:body>');
  if (!body || end < body.index) throw new Error('Invalid document body');
  const start = body.index + body[0].length;
  const content = xml.slice(start, end);
  const tags = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[^>]*\?>|<[^>]+>/g;
  let depth = 0, elementStart = 0, count = 0, chars = 0, cut = 0, section = '', truncated = false;
  for (const match of content.matchAll(tags)) {
    const tag = match[0], index = match.index;
    if (tag.startsWith('<!') || tag.startsWith('<?')) continue;
    const closing = tag.startsWith('</');
    const selfClosing = /\/\s*>$/.test(tag);
    if (!closing && depth === 0) elementStart = index;
    if (closing) depth--;
    else if (!selfClosing) depth++;
    if (depth < 0) throw new Error('Invalid document structure');
    if (depth === 0) {
      const element = content.slice(elementStart, index + tag.length);
      if (/^<w:sectPr(?:\s|>|\/)/.test(element)) { section = element; continue; }
      // Word also puts other things directly in the body (content controls such as an automatic table of contents,
      // bookmarks, tracked changes). They are measured and kept like paragraphs; refusing them hid the whole document.
      const textLength = [...element.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].reduce((n, m) => n + m[1].length, 0);
      if (truncated || count >= limit || chars + textLength > 60000 * (limit / INITIAL_ELEMENTS) || element.length > 300000 * (limit / INITIAL_ELEMENTS)) { truncated = true; continue; }
      chars += textLength; count++; cut = index + tag.length;
    }
  }
  if (depth !== 0 || (!count && truncated)) throw new Error('Document is too complex to preview');
  return { xml: xml.slice(0, start) + content.slice(0, cut) + section + xml.slice(end), truncated };
}

export async function preparePreview(zip: JSZip, xml: string, budget: number) {
  const trimmed = trimDocument(xml, budget);
  return { bytes: await archiveDocument(zip, trimmed.xml), truncated: trimmed.truncated };
}

export async function archiveDocument(zip: JSZip, xml: string, limits = { image: 4_000_000, total: 30_000_000 }) {
  const copy = new JSZip();
  let mediaBytes = 0;
  const placeholder = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,2,0,0,0,144,119,83,222,0,0,0,12,73,68,65,84,120,156,99,56,112,224,0,0,4,132,2,65,225,141,175,39,0,0,0,0,73,69,78,68,174,66,96,130]);
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (name === 'word/document.xml') { copy.file(name, xml); continue; }
    if (/^word\/media\//i.test(name)) {
      const size = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
      if (size == null || size > limits.image || mediaBytes + size > limits.total) { copy.file(name, placeholder); continue; }
      mediaBytes += size;
    }
    // Passing the compressed entry avoids inflating unrelated parts or large images.
    copy.file(name, (entry as unknown as { _data: Uint8Array })._data);
  }
  return copy.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
}

