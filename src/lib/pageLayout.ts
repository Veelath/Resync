// The Word viewer draws everything between two page breaks as one long sheet. This cuts each sheet into real pages:
// the same page height and margins as the file, lines as tall as Word makes them, paragraphs and tables cut where the
// page ends.
import { planBreaks, type Block, type Span } from './pagePlan';

// Set text the way Word does: its default font, no hyphenation or kerning added by the browser, tables to their own
// column widths. A continued paragraph is the rest of one already begun, so it gets no second bullet or number.
const PAGE_CSS = `
.docx-wrapper section.docx { font-family: 'Times New Roman', Times, serif; line-height: normal; letter-spacing: normal; hyphens: manual; font-kerning: none; font-variant-ligatures: none; }
.docx-wrapper section.docx table { float: none !important; table-layout: fixed; }
.docx p[data-continued]::before { content: none !important; counter-increment: none !important; }
`;

/** Word's "single" line is the font's own line height (about 1.15 times its size), while the browser's 1 is the size. */
function fixLineHeights(root: HTMLElement) {
  const natural = new Map<string, number>();
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;font-size:100px;line-height:normal;white-space:nowrap';
  probe.textContent = 'Mg';
  root.appendChild(probe);
  const ratioFor = (font: string) => {
    let ratio = natural.get(font);
    if (ratio === undefined) {
      probe.style.fontFamily = font;
      ratio = probe.offsetHeight / 100 || 1.15;
      natural.set(font, ratio);
    }
    return ratio;
  };
  const changes: { paragraph: HTMLElement; ratio: number; empty: boolean }[] = [];
  root.querySelectorAll<HTMLElement>('section.docx p').forEach(paragraph => {
    // exact and "at least" spacing are given in points and are already right
    if (paragraph.style.minHeight || paragraph.style.lineHeight.includes('calc')) return;
    const style = getComputedStyle(paragraph);
    const empty = !paragraph.textContent && !paragraph.querySelector('img, svg, br, div');
    const text = paragraph.querySelector('span') ?? paragraph;
    const given = style.lineHeight === 'normal' ? 1 : parseFloat(style.lineHeight) / parseFloat(style.fontSize);
    if (!(given >= 0.8 && given <= 3.5)) return;
    const font = ratioFor(getComputedStyle(text).fontFamily);
    changes.push({ paragraph, ratio: style.lineHeight === 'normal' ? font : given * font, empty });
  });
  probe.remove();
  for (const { paragraph, ratio, empty } of changes) {
    paragraph.style.lineHeight = ratio.toFixed(3);
    if (empty) paragraph.style.minHeight = `${ratio.toFixed(3)}em`;   // an empty line takes a whole line, as in Word
  }
}

/** Each tab reaches the next tab stop, as in Word; the viewer draws every tab as one fixed space. */
function alignTabs(root: HTMLElement, step: number) {
  root.querySelectorAll<HTMLElement>('section.docx article p').forEach(paragraph => {
    const tabs = [...paragraph.querySelectorAll('span')].filter(span => !span.firstElementChild && span.textContent === '\u2003');
    if (!tabs.length) return;
    const left = paragraph.closest('article')!.getBoundingClientRect().left;
    tabs.forEach((tab, index) => {
      tab.style.display = 'inline-block';
      tab.style.width = '0px';
      const box = tab.getBoundingClientRect();
      let width = (Math.floor((box.left - left + 0.5) / step) + 1) * step - (box.left - left);
      // a contents entry made by Word sends its page number to the right margin
      if (index === tabs.length - 1 && /docx-right-tab|_toc\d/i.test(paragraph.className) && tab.parentElement) {
        const after = document.createRange();
        after.setStartAfter(tab);
        after.setEndAfter(paragraph.lastChild!);
        const number = after.toString().trim();
        if (/^(\d{1,4}|[ivxlc]{1,7})$/i.test(number)) {
          const end = paragraph.getBoundingClientRect().right - parseFloat(getComputedStyle(paragraph).paddingRight);
          width = Math.max(width, end - box.left - after.getBoundingClientRect().width - 1);
        }
      }
      tab.style.width = `${width}px`;
    });
  });
}

/** A table that is not shown, with a row taller than the rest of a page, becomes blank space that can be cut anywhere. */
function openTallTables(root: HTMLElement) {
  root.querySelectorAll<HTMLTableElement>('section.docx article > table.docx-hidden-visual').forEach(table => {
    const page = parseFloat(getComputedStyle(table.closest('section.docx')!).minHeight);
    if (!page || ![...table.rows].some(row => row.offsetHeight > page / 2)) return;
    const height = table.offsetHeight;
    const count = Math.ceil(height / 40);
    table.replaceWith(...Array.from({ length: count }, () => {
      const space = document.createElement('div');
      space.className = 'docx-hidden-visual';
      space.style.height = `${height / count}px`;
      return space;
    }));
  });
}

/** The lines of a paragraph, top to bottom. */
function linesOf(paragraph: HTMLElement): Span[] {
  const range = document.createRange();
  range.selectNodeContents(paragraph);
  const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0).sort((a, b) => a.top - b.top);
  const text: Span[] = [];
  for (const rect of rects) {
    const line = text[text.length - 1];
    if (line && (rect.top + rect.bottom) / 2 < line.bottom) line.bottom = Math.max(line.bottom, rect.bottom);
    else text.push({ top: rect.top, bottom: rect.bottom });
  }
  const box = paragraph.getBoundingClientRect();
  // A line takes the space between its neighbours, not only the height of its letters.
  return text.map((line, index) => ({
    top: index === 0 ? box.top : (text[index - 1].bottom + line.top) / 2,
    bottom: index === text.length - 1 ? box.bottom : (line.bottom + text[index + 1].top) / 2,
  }));
}

/** The first character drawn below `y`. */
function caretBelow(paragraph: HTMLElement, y: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const isBelow = (rect: DOMRect | undefined) => !!rect && rect.height > 0 && (rect.top + rect.bottom) / 2 > y;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    if (!node.length) continue;
    range.selectNodeContents(node);
    const rects = range.getClientRects();
    if (!isBelow(rects[rects.length - 1])) continue;
    let low = 0, high = node.length - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      range.setStart(node, middle);
      range.setEnd(node, middle + 1);
      const rect = range.getClientRects()[0];
      // a space at a line's end may have no box: look further on
      if (isBelow(rect)) high = middle; else low = middle + 1;
    }
    return { node, offset: low };
  }
  return null;
}

const isHeading = (element: HTMLElement) => {
  const text = element.textContent?.trim() ?? '';
  if (element.tagName !== 'P' || !text || text.length > 90 || /[.:;,]$/.test(text)) return false;
  return text === text.toUpperCase() || Number(getComputedStyle(element.querySelector('span') ?? element).fontWeight) >= 600;
};

interface Chrome { header: Element | null; footer: Element | null }

/** A section that carries on down the same page shares the sheet of the one before it. Each keeps its own header. */
function joinContinuousSections(root: HTMLElement): WeakMap<Element, Chrome> {
  const chrome = new WeakMap<Element, Chrome>();
  let open: HTMLElement | null = null;
  for (const sheet of [...root.querySelectorAll<HTMLElement>('section.docx')]) {
    const articles = [...sheet.querySelectorAll(':scope > article')];
    const own = { header: sheet.querySelector(':scope > header'), footer: sheet.querySelector(':scope > footer') };
    for (const article of articles) chrome.set(article, own);
    const before: Element | null = open?.querySelector(':scope > article:last-of-type') ?? null;
    if (open && before?.lastElementChild?.classList.contains('docx-continues')) {
      const footer = open.querySelector(':scope > footer');
      for (const article of articles) open.insertBefore(article, footer);
      sheet.remove();
    } else open = sheet;
  }
  return chrome;
}

const CHAPTER = /^chapter\s+(\d{1,2}|[ivxl]{1,5})\b/i;
const PUSHING_LINES = 5;   // this many empty lines before a chapter are there to start it on a new page

function splitSheet(sheet: HTMLElement, chrome: WeakMap<Element, Chrome>) {
  const style = getComputedStyle(sheet);
  const height = parseFloat(style.minHeight);
  if (!height || sheet.getBoundingClientRect().height <= height + 1) return;
  const articles = [...sheet.querySelectorAll<HTMLElement>(':scope > article')];
  if (!articles.length) return;
  const box = sheet.getBoundingClientRect();
  const start = articles[0].getBoundingClientRect().top;
  const footer = sheet.querySelector<HTMLElement>(':scope > footer');
  const paddingBottom = parseFloat(style.paddingBottom);
  // what is left for text: the page less its margins, and less any header or footer taller than its margin
  const footerExtra = footer ? Math.max(0, footer.getBoundingClientRect().height + (parseFloat(getComputedStyle(footer).marginBottom) || 0)) : 0;
  const available = height - paddingBottom - (start - box.top) - footerExtra;
  if (available < 100) return;

  const items: { element: HTMLElement; block: Block }[] = [];
  for (const article of articles) {
    const columns = Number(getComputedStyle(article).columnCount) > 1;   // text in columns is moved as one piece
    for (const element of (columns ? [article] : [...article.children] as HTMLElement[])) {
      const rect = element.getBoundingClientRect();
      if (!rect.height) continue;
      const block: Block = { top: rect.top, bottom: rect.bottom };
      if (rect.height > 2 && element.tagName === 'P') {
        // The extra space of wide line spacing may hang below the last line of a page, as it does in Word.
        const text = getComputedStyle(element);
        const slack = Math.max(0, (parseFloat(text.lineHeight) - parseFloat(text.fontSize) * 1.15) / 2) || 0;
        block.bottom -= slack;
        block.parts = linesOf(element).map(line => ({ top: line.top, bottom: line.bottom - slack }));
        block.heading = isHeading(element);
        block.blank = !element.textContent?.trim() && !element.querySelector('img, svg, canvas, br, table');
      }
      else if (element instanceof HTMLTableElement) {
        block.rows = true;
        block.parts = [...element.rows].map(row => { const r = row.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
      }
      items.push({ element, block });
    }
  }

  let blanks = 0;
  for (const { element, block } of items) {
    const text = element.textContent?.trim() ?? '';
    if (blanks >= PUSHING_LINES && text.length < 80 && CHAPTER.test(text)) block.startsPage = true;
    blanks = block.blank ? blanks + 1 : 0;
  }

  // Every cutting point is found before anything moves.
  const absorbed = new Set<number>();
  const cuts = planBreaks(items.map(item => item.block), available, start, absorbed).map(cut => {
    const { element, block } = items[cut.block];
    if (cut.part === undefined) return { element, row: -1, caret: null };
    if (block.rows) return { element, row: cut.part, caret: null };
    return { element, row: -1, caret: caretBelow(element, block.parts![cut.part].top) };
  });

  for (const index of absorbed) items[index].element.style.display = 'none';

  // From the last cut to the first, so that earlier positions stay true.
  for (const { element, row, caret } of cuts.reverse()) {
    let tail = element;
    if (row > 0 && element instanceof HTMLTableElement) {
      tail = element.cloneNode(false) as HTMLElement;
      const columns = element.querySelector(':scope > colgroup');
      if (columns) tail.appendChild(columns.cloneNode(true));
      for (const moved of [...element.rows].slice(row)) tail.appendChild(moved);
      element.after(tail);
    } else if (caret && element.lastChild) {
      const range = document.createRange();
      range.setStart(caret.node, caret.offset);
      range.setEndAfter(element.lastChild);
      tail = element.cloneNode(false) as HTMLElement;
      tail.appendChild(range.extractContents());
      tail.dataset.continued = 'true';
      tail.style.textIndent = '0';
      tail.style.marginTop = '0';
      element.style.marginBottom = '0';
      if (getComputedStyle(element).textAlign === 'justify') element.style.textAlignLast = 'justify';
      element.after(tail);
    }
    const article = tail.tagName === 'ARTICLE' ? tail : tail.parentElement!;
    const page = sheet.cloneNode(false) as HTMLElement;
    const own = chrome.get(article);
    if (own?.header) page.appendChild(own.header.cloneNode(true));
    const rest: Element[] = [];
    for (let next = article.nextElementSibling; next && next.tagName === 'ARTICLE'; next = next.nextElementSibling) rest.push(next);
    if (article === tail) page.appendChild(article);
    else {
      const copy = article.cloneNode(false) as HTMLElement;
      if (own) chrome.set(copy, own);
      for (let node: ChildNode | null = tail; node;) { const next: ChildNode | null = node.nextSibling; copy.appendChild(node); node = next; }
      page.appendChild(copy);
    }
    for (const other of rest) page.appendChild(other);
    if (own?.footer) page.appendChild(own.footer.cloneNode(true));
    sheet.after(page);
  }
}

/** Lays the drawn document out off screen, at full size, and cuts it into pages. The result is put back into `body`. */
export async function layoutPages(body: HTMLElement, styles: HTMLElement, tabStop = 48): Promise<void> {
  const stage = document.createElement('div');
  stage.setAttribute('aria-hidden', 'true');
  stage.style.cssText = 'position:absolute;left:-100000px;top:0;width:max-content;visibility:hidden';
  const extra = document.createElement('style');
  extra.textContent = PAGE_CSS;
  styles.appendChild(extra);
  const content = document.createElement('div');
  content.append(...body.childNodes);
  stage.append(styles, content);
  document.body.appendChild(stage);
  try {
    await Promise.race([document.fonts?.ready, new Promise(resolve => setTimeout(resolve, 3000))]);
    fixLineHeights(content);
    alignTabs(content, tabStop);
    openTallTables(content);
    const chrome = joinContinuousSections(content);
    for (const sheet of [...content.querySelectorAll<HTMLElement>('section.docx')]) splitSheet(sheet, chrome);
  } finally {
    // handed back even if cutting failed: the pages are then only longer than in the file
    body.append(...content.childNodes);
    stage.remove();
    styles.remove();
  }
}
