// Finds sentences inside a rendered Word document and wraps them in <mark>, even when a sentence is split across
// several formatting runs (bold, italic, links...). Matching ignores differences in whitespace only.

export interface HighlightSpec {
  /** Unique id; the first mark of a sentence gets the DOM id `highlight-${id}`. */
  id: string;
  text: string;
  /** Inline colors for the mark. */
  background: string;
  border: string;
  /** Called when the highlight is clicked. */
  onClick?: (id: string) => void;
  title?: string;
}

interface Located { node: Text; offset: number }

// One paragraph: its text with runs of whitespace collapsed, and where each collapsed character came from.
function indexParagraph(paragraph: Element) {
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  const map: Located[] = [];
  let text = '';
  let lastWasSpace = true;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const value = node.nodeValue ?? '';
    for (let offset = 0; offset < value.length; offset++) {
      const isSpace = /\s/.test(value[offset]);
      if (isSpace && lastWasSpace) continue;
      text += isSpace ? ' ' : value[offset];
      map.push({ node, offset });
      lastWasSpace = isSpace;
    }
  }
  return { text, map };
}

const collapse = (value: string) => value.replace(/\s+/g, ' ').trim();

function wrap(located: Located[], spec: HighlightSpec, first: boolean) {
  // Group the matched characters by text node, then wrap each node's slice (last node first, so offsets stay valid).
  const slices: { node: Text; start: number; end: number }[] = [];
  for (const { node, offset } of located) {
    const last = slices[slices.length - 1];
    if (last && last.node === node) last.end = offset + 1;
    else slices.push({ node, start: offset, end: offset + 1 });
  }
  slices.reverse().forEach((slice, index) => {
    const range = document.createRange();
    range.setStart(slice.node, slice.start);
    range.setEnd(slice.node, slice.end);
    const mark = document.createElement('mark');
    mark.dataset.highlightFor = spec.id;
    mark.style.cssText = `background:${spec.background};border-bottom:2px solid ${spec.border};border-radius:2px;color:inherit;padding:0${spec.onClick ? ';cursor:pointer' : ''}`;
    if (spec.title) mark.title = spec.title;
    if (first && index === slices.length - 1) { mark.id = `highlight-${spec.id}`; mark.tabIndex = spec.onClick ? 0 : -1; if (spec.onClick) mark.setAttribute('role', 'button'); }
    if (spec.onClick) {
      mark.addEventListener('click', () => spec.onClick?.(spec.id));
      mark.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); spec.onClick?.(spec.id); } });
    }
    range.surroundContents(mark);
  });
}

/** Highlights each sentence once and returns the ids that were found in the document. */
export function highlightSentences(root: HTMLElement, specs: HighlightSpec[]): Set<string> {
  const found = new Set<string>();
  const paragraphs = Array.from(root.querySelectorAll('p')).filter(paragraph => !paragraph.closest('mark'));
  const indexed = paragraphs.map(paragraph => ({ paragraph, ...indexParagraph(paragraph) }));
  const done = new Set<string>();

  for (const spec of specs) {
    const needle = collapse(spec.text);
    if (!needle || done.has(needle)) continue;
    for (const entry of indexed) {
      const at = entry.text.indexOf(needle);
      if (at < 0) continue;
      wrap(entry.map.slice(at, at + needle.length), spec, true);
      found.add(spec.id);
      done.add(needle);
      // wrapping split this paragraph's text nodes, so index it again before another sentence is searched in it
      Object.assign(entry, indexParagraph(entry.paragraph));
      break;
    }
  }
  return found;
}
