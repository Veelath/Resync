// Decides where the pages of a Word document end. Pure rules, no DOM, so they can be tested.

export interface Span { top: number; bottom: number }
export interface Block extends Span {
  /** The lines of a paragraph, or the rows of a table: the places the block can be cut. */
  parts?: Span[];
  /** Rows may stand alone on a page; single lines of a paragraph may not (widow and orphan control). */
  rows?: boolean;
  /** A heading is kept on the same page as what follows it. */
  heading?: boolean;
  /** An empty line. */
  blank?: boolean;
  /** Opens a page of its own, whatever room is left before it. */
  startsPage?: boolean;
}
/** A new page starts at `block`, or at its `part`-th line or row. */
export interface PageBreak { block: number; part?: number }

const SLACK = 1;   // rounding in measured sizes

/**
 * `start` is where the first page's text begins and `available` the height of text one page holds. Empty lines that run
 * past the foot of a page are listed in `absorbed`: they are left out, so the next page begins with its writing.
 */
export function planBreaks(blocks: Block[], available: number, start: number, absorbed: Set<number> = new Set()): PageBreak[] {
  const breaks: PageBreak[] = [];
  let pageTop = start;
  let first = 0;   // the block the current page starts with
  let part = 0;    // the line or row of the current block the current page starts with
  for (let i = 0; i < blocks.length;) {
    const block = blocks[i];
    if (block.startsPage && i > first && part === 0) {
      breaks.push({ block: i });
      pageTop = block.top;
      first = i;
    }
    if (block.bottom - pageTop <= available + SLACK) { i++; part = 0; continue; }
    if (block.blank && i > first) { absorbed.add(i++); continue; }
    const parts = block.parts ?? [];
    const over = parts.findIndex((line, n) => n >= part && line.bottom - pageTop > available + SLACK);
    const keep = block.rows ? 1 : 2;
    const cut = over < 0 ? -1 : Math.min(over, parts.length - keep);
    if (cut - part >= keep) {
      breaks.push({ block: i, part: cut });
      pageTop = parts[cut].top;
      first = i;
      part = cut;
    } else if (i > first) {
      let from = i;
      while (from - 1 > first && blocks[from - 1].heading) from--;
      breaks.push({ block: from });
      pageTop = blocks[from].top;
      first = i = from;
      part = 0;
    } else if (over > part) {   // it already starts the page, so it is cut even if one line is left alone
      breaks.push({ block: i, part: over });
      pageTop = parts[over].top;
      part = over;
    } else { i++; part = 0; }   // taller than a page and cannot be cut: the page grows to hold it
  }
  return breaks;
}

interface Section { type?: string; headerRefs?: unknown; footerRefs?: unknown }
interface Parsed { type?: string; break?: string; className?: string; sectionProps?: Section; tabs?: { style?: string }[]; children?: Parsed[] }

const addClass = (element: Parsed, name: string) => { element.className = element.className ? `${element.className} ${name}` : name; };
const hasPageBreak = (paragraph: Parsed) => (paragraph.children ?? []).some(run => (run.children ?? []).some(item => item.type === 'break' && item.break === 'page'));

/**
 * Notes on a document parsed by docx-preview what its drawing needs: which section breaks carry on down the same page
 * ("continuous"), which headers a section takes from the one before it, and which lines end at a right-hand tab stop.
 */
export function markLayout(body: { children?: Parsed[]; props?: Section }): void {
  const paragraphs = (body.children ?? []).filter(child => child.type === 'paragraph');
  const ends = paragraphs.filter(child => child.sectionProps);
  const sections = [...ends.map(end => end.sectionProps!), ...(body.props ? [body.props] : [])];
  sections.forEach((section, index) => {
    if (!index) return;
    section.headerRefs ??= sections[index - 1].headerRefs;
    section.footerRefs ??= sections[index - 1].footerRefs;
  });
  ends.forEach((paragraph, index) => {
    const next = sections[index + 1];
    if ((next?.type === 'continuous' || next?.type === 'nextColumn') && !hasPageBreak(paragraph)) addClass(paragraph, 'docx-continues');
  });
  for (const paragraph of paragraphs) if (paragraph.tabs?.some(tab => tab.style === 'right' || tab.style === 'end')) addClass(paragraph, 'docx-right-tab');
}
