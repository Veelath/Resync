// Reads the structure of a Word file straight from its XML, so the PDF copy of a manuscript looks like the manuscript: the same paragraphs
// in the same order, with their alignment, indents, spacing, bold/italic/underline, text sizes, numbered and bulleted lists, and page breaks.
// Tables, pictures, text boxes and diagrams are left out, as everywhere else in the report. No DOM is needed, so it also runs in tests.
import JSZip from 'jszip';

export interface DocxRun { text: string; bold: boolean; italic: boolean; underline: boolean }
export interface DocxBlock {
  kind: 'paragraph' | 'page';
  runs: DocxRun[];
  align: 'left' | 'center' | 'right' | 'justify';
  size: number;          // points
  left: number;          // left indent, points
  first: number;         // first-line indent (negative for hanging), points
  before: number;        // space before, points
  after: number;         // space after, points
  lineFactor: number;    // line height as a multiple of the font size
  marker?: string;       // list marker such as "•" or "2."
}

interface Tag { name: string; attrs: Record<string, string>; closing: boolean; selfClosing: boolean; index: number; end: number }

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (value: string) => value.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|(\w+));/g, (all, dec, hex, name) =>
  dec ? String.fromCodePoint(Number(dec)) : hex ? String.fromCodePoint(parseInt(hex, 16)) : (ENTITIES[name] ?? all));

function* tags(xml: string): Generator<Tag> {
  const pattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  for (const match of xml.matchAll(pattern)) {
    if (match[2] === undefined) continue;
    const attrs: Record<string, string> = {};
    for (const a of match[3].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = decode(a[2] ?? a[3] ?? '');
    yield { name: match[2], attrs, closing: match[1] === '/', selfClosing: match[4] === '/', index: match.index!, end: match.index! + match[0].length };
  }
}

const on = (value: string | undefined) => value === undefined ? true : !/^(?:0|false|off|none)$/i.test(value);

interface Props { bold?: boolean; italic?: boolean; underline?: boolean; caps?: boolean; size?: number;
  align?: DocxBlock['align']; left?: number; first?: number; before?: number; after?: number; line?: number; lineRule?: string; numId?: string; level?: number }
interface Style { basedOn?: string; props: Props }

const twips = (value: string | undefined) => value === undefined || value === '' ? undefined : Number(value) / 20;
const align = (value: string | undefined): DocxBlock['align'] | undefined =>
  value === 'center' ? 'center' : value === 'right' || value === 'end' ? 'right' : value === 'both' || value === 'distribute' ? 'justify' : value === 'left' || value === 'start' ? 'left' : undefined;

/** Reads one run-property or paragraph-property tag into `props`. */
function readProp(tag: Tag, props: Props) {
  const v = tag.attrs['w:val'];
  switch (tag.name) {
    case 'w:b': props.bold = on(v); break;
    case 'w:i': props.italic = on(v); break;
    case 'w:u': props.underline = on(v); break;
    case 'w:caps': props.caps = on(v); break;
    case 'w:sz': if (v) props.size = Number(v) / 2; break;
    case 'w:jc': props.align = align(v) ?? props.align; break;
    case 'w:ind': {
      const left = twips(tag.attrs['w:left'] ?? tag.attrs['w:start']);
      if (left !== undefined) props.left = left;
      const hanging = twips(tag.attrs['w:hanging']);
      const first = twips(tag.attrs['w:firstLine']);
      if (hanging !== undefined) props.first = -hanging; else if (first !== undefined) props.first = first;
      break;
    }
    case 'w:spacing': {
      const before = twips(tag.attrs['w:before']), after = twips(tag.attrs['w:after']);
      if (before !== undefined) props.before = before;
      if (after !== undefined) props.after = after;
      if (tag.attrs['w:line'] !== undefined) { props.line = Number(tag.attrs['w:line']); props.lineRule = tag.attrs['w:lineRule'] ?? 'auto'; }
      break;
    }
    case 'w:numId': props.numId = v; break;
    case 'w:ilvl': props.level = Number(v ?? 0); break;
  }
}

function parseStyles(xml: string): { styles: Map<string, Style>; defaults: Props; defaultStyle?: string } {
  const styles = new Map<string, Style>();
  const defaults: Props = {};
  let defaultStyle: string | undefined;
  let current: { id: string; style: Style } | null = null;
  let inDefaults = false;
  for (const tag of tags(xml)) {
    if (tag.name === 'w:docDefaults') inDefaults = !tag.closing;
    else if (tag.name === 'w:style') {
      if (tag.closing) current = null;
      else {
        current = { id: tag.attrs['w:styleId'] ?? '', style: { props: {} } };
        styles.set(current.id, current.style);
        if (tag.attrs['w:type'] === 'paragraph' && tag.attrs['w:default'] === '1') defaultStyle = current.id;
      }
    } else if (tag.closing) continue;
    else if (current && tag.name === 'w:basedOn') current.style.basedOn = tag.attrs['w:val'];
    else if (current) readProp(tag, current.style.props);
    else if (inDefaults) readProp(tag, defaults);
  }
  return { styles, defaults, defaultStyle };
}

interface Level { format: string; text: string; start: number }
function parseNumbering(xml: string): { abstract: Map<string, Map<number, Level>>; nums: Map<string, string> } {
  const abstract = new Map<string, Map<number, Level>>();
  const nums = new Map<string, string>();
  let abstractId = '', level = -1, numId = '';
  for (const tag of tags(xml)) {
    if (tag.closing) { if (tag.name === 'w:lvl') level = -1; continue; }
    if (tag.name === 'w:abstractNum') { abstractId = tag.attrs['w:abstractNumId'] ?? ''; abstract.set(abstractId, new Map()); }
    else if (tag.name === 'w:lvl') { level = Number(tag.attrs['w:ilvl'] ?? 0); abstract.get(abstractId)?.set(level, { format: 'decimal', text: '%1.', start: 1 }); }
    else if (level >= 0 && tag.name === 'w:numFmt') { const l = abstract.get(abstractId)?.get(level); if (l) l.format = tag.attrs['w:val'] ?? 'decimal'; }
    else if (level >= 0 && tag.name === 'w:lvlText') { const l = abstract.get(abstractId)?.get(level); if (l) l.text = tag.attrs['w:val'] ?? ''; }
    else if (level >= 0 && tag.name === 'w:start') { const l = abstract.get(abstractId)?.get(level); if (l) l.start = Number(tag.attrs['w:val'] ?? 1); }
    else if (tag.name === 'w:num') numId = tag.attrs['w:numId'] ?? '';
    else if (tag.name === 'w:abstractNumId' && numId) nums.set(numId, tag.attrs['w:val'] ?? '');
  }
  return { abstract, nums };
}

const roman = (n: number) => { const map: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let out = ''; for (const [v, s] of map) while (n >= v) { out += s; n -= v; } return out; };
const letters = (n: number) => { let out = ''; for (let i = n; i > 0; i = Math.floor((i - 1) / 26)) out = String.fromCharCode(97 + ((i - 1) % 26)) + out; return out; };
function formatNumber(format: string, n: number): string {
  switch (format) {
    case 'lowerLetter': return letters(n);
    case 'upperLetter': return letters(n).toUpperCase();
    case 'lowerRoman': return roman(n).toLowerCase();
    case 'upperRoman': return roman(n);
    default: return String(n);
  }
}

export async function readDocxStructure(file: Blob): Promise<DocxBlock[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) throw new Error('Missing document');
  const { styles, defaults, defaultStyle } = parseStyles(await zip.file('word/styles.xml')?.async('string') ?? '');
  const numbering = parseNumbering(await zip.file('word/numbering.xml')?.async('string') ?? '');

  const resolve = (styleId: string | undefined): Props => {
    const chain: Props[] = [];
    const seen = new Set<string>();
    for (let id = styleId ?? defaultStyle; id && !seen.has(id); id = styles.get(id)?.basedOn) { seen.add(id); const style = styles.get(id); if (style) chain.push(style.props); }
    return Object.assign({}, defaults, ...chain.reverse());
  };

  const blocks: DocxBlock[] = [];
  const counters = new Map<string, number[]>();
  let skip = 0;            // depth inside a table, picture, text box or diagram
  let skipName = '';
  let paragraph: { style: Props; direct: Props; runs: DocxRun[]; sectionBreak: boolean; split: boolean } | null = null;
  let run: { direct: Props; text: string } | null = null;
  let inParagraphProps = false, inParagraphMark = false, inRunProps = false, inText = false, pendingBreak = false;
  const SKIP = new Set(['w:tbl', 'w:drawing', 'w:pict', 'w:object', 'mc:AlternateContent', 'w:txbxContent', 'w:footnoteReference']);

  const finish = (pageBreakAfter: boolean) => {
    if (!paragraph) return;
    const pageBlock = (): DocxBlock => ({ kind: 'page', runs: [], align: 'left', size: 12, left: 0, first: 0, before: 0, after: 0, lineFactor: 1 });
    if (paragraph.split && !paragraph.runs.length) { if (pageBreakAfter) blocks.push(pageBlock()); return; }   // what is left of a paragraph after a page break
    const style = paragraph.style, direct = paragraph.direct;
    const merged: Props = { ...style, ...direct };
    const runs = paragraph.runs;
    let marker: string | undefined;
    if (merged.numId && merged.numId !== '0') {
      const abstractId = numbering.nums.get(merged.numId);
      const levels = abstractId !== undefined ? numbering.abstract.get(abstractId) : undefined;
      const level = merged.level ?? 0;
      const def = levels?.get(level);
      if (def) {
        const counts = counters.get(merged.numId) ?? [];
        counts[level] = (counts[level] ?? def.start - 1) + 1;
        for (let deeper = level + 1; deeper < counts.length; deeper++) counts[deeper] = 0;
        counters.set(merged.numId, counts);
        marker = def.format === 'bullet' ? '•' : def.text.replace(/%(\d)/g, (_all, n) => {
          const at = Number(n) - 1;
          return formatNumber(levels?.get(at)?.format ?? 'decimal', counts[at] ?? levels?.get(at)?.start ?? 1);
        });
      }
    }
    const lineFactor = merged.line === undefined ? 1.15 : merged.lineRule === 'auto' ? Math.max(1, (merged.line / 240) * 1.15) : 1.15;
    const size = Math.min(26, Math.max(8, runs.length ? (paragraph.direct.size ?? merged.size ?? 12) : (merged.size ?? 12)));
    blocks.push({ kind: 'paragraph', runs, align: merged.align ?? 'left', size, left: merged.left ?? 0, first: merged.first ?? 0,
      before: merged.before ?? 0, after: merged.after ?? 0, lineFactor, ...(marker ? { marker } : {}) });
    if (pageBreakAfter) blocks.push(pageBlock());
    paragraph.runs = [];
    paragraph.split = true;
  };

  const addText = (text: string) => {
    if (!paragraph || !run || !text) return;
    const style = paragraph.style, direct = { ...run.direct };
    const bold = direct.bold ?? style.bold ?? false, italic = direct.italic ?? style.italic ?? false, underline = direct.underline ?? style.underline ?? false;
    const caps = direct.caps ?? style.caps ?? false;
    const shown = caps ? text.toUpperCase() : text;
    const last = paragraph.runs[paragraph.runs.length - 1];
    if (last && last.bold === bold && last.italic === italic && last.underline === underline) last.text += shown;
    else paragraph.runs.push({ text: shown, bold, italic, underline });
    if (direct.size && !paragraph.direct.size) paragraph.direct.size = direct.size;
  };

  const body = /<w:body[\s>]/.exec(documentXml);
  const xml = body ? documentXml.slice(body.index) : documentXml;
  let cursor = 0;
  for (const tag of tags(xml)) {
    if (inText) {   // the characters between <w:t> and </w:t>
      if (tag.name === 'w:t' && tag.closing) { addText(decode(xml.slice(cursor, tag.index))); inText = false; }
    }
    cursor = tag.end;
    if (skip) {
      if (tag.name === skipName && !tag.selfClosing) skip += tag.closing ? -1 : 1;
      continue;
    }
    if (!tag.closing && SKIP.has(tag.name) && !tag.selfClosing) { skip = 1; skipName = tag.name; continue; }
    if (tag.closing) {
      if (tag.name === 'w:pPr') { inParagraphProps = false; }
      else if (tag.name === 'w:rPr') { if (inParagraphProps) inParagraphMark = false; else inRunProps = false; }
      else if (tag.name === 'w:r') run = null;
      else if (tag.name === 'w:p') { finish(pendingBreak || (paragraph?.sectionBreak ?? false)); paragraph = null; pendingBreak = false; }
      continue;
    }
    switch (tag.name) {
      case 'w:p': paragraph = { style: resolve(undefined), direct: {}, runs: [], sectionBreak: false, split: false }; pendingBreak = false; break;
      case 'w:pPr': inParagraphProps = true; break;
      case 'w:rPr': if (inParagraphProps) inParagraphMark = true; else inRunProps = true; break;
      case 'w:r': run = { direct: {}, text: '' }; break;
      case 'w:pStyle': if (paragraph) paragraph.style = resolve(tag.attrs['w:val']); break;
      case 'w:pageBreakBefore': if (paragraph && on(tag.attrs['w:val'])) blocks.push({ kind: 'page', runs: [], align: 'left', size: 12, left: 0, first: 0, before: 0, after: 0, lineFactor: 1 }); break;
      case 'w:sectPr': if (inParagraphProps && paragraph) paragraph.sectionBreak = true; break;
      case 'w:type': if (inParagraphProps && paragraph && tag.attrs['w:val'] === 'continuous') paragraph.sectionBreak = false; break;
      case 'w:t': if (run && !tag.selfClosing) inText = true; break;
      case 'w:tab': if (run && !inParagraphProps) addText('    '); break;
      case 'w:br': case 'w:cr':
        if (run) { if (tag.attrs['w:type'] === 'page') { finish(true); pendingBreak = false; } else addText('\n'); }
        break;
      case 'w:noBreakHyphen': addText('-'); break;
      default:
        if (inParagraphProps && !inParagraphMark && paragraph) readProp(tag, paragraph.direct);
        else if (inRunProps && run) readProp(tag, run.direct);
    }
  }
  if (!blocks.length) throw new Error('No text');
  return blocks;
}
