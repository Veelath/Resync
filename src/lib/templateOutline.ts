// Reads the headings of a template that uses no Word heading styles: an outline or table of contents typed as plain
// lines (or a table), often with tabs and page numbers.
import type { TemplateChapter } from './savedTemplate';

const NUMBER = '(\\d{1,2}|[IVX]{1,5}|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN)';
const CHAPTER_WORD = new RegExp(`^chapter\\s+${NUMBER}\\b[\\s.:\\-–—]*(.*)$`, 'i');
const NUMBER_FIRST = /^(\d{1,2}|[IVX]{1,5})[.)]?\s+(\S.*)$/;
// "Rationale of the Study ....... 12": a number set apart by a tab, a wide gap or dot leaders.
const PAGE_NUMBER = /(\t|\s{2,}|\.{3,}|…)[\s.…]*(\d{1,4}|[ivxl]{1,6}|[IVXL]{1,6})\s*$/;
// Column titles and the pages before and after the paper are not sections of it.
const NOT_A_SECTION = /^(chapters?|pages?|page (no|number)|chapter\s+page|table of contents|contents|title page|approval sheet|acknowledg\w*|dedication|list of .+|appendi(x|ces)\b.*|curriculum vitae|team composition)$/i;
// A bold line in capitals with one of these names stands on its own, beside the chapters.
const TOP_LEVEL = /^(summary|findings|conclusions?|recommendations|references|bibliography)$/i;
// Once the chapters have begun, these start the back matter: nothing after them is a heading of the paper.
const BACK_MATTER = /^(appendi(x|ces)\b.*|team composition|curriculum vitae|list of (tables|figures)|table of contents)$/i;
const UNFINISHED = /(,|\b(and|or|of|the|on|in|to|for|between|with|among|a|an))$/i;
const MAX_HEADING_WORDS = 12;

const tidy = (line: string) => line.replace(/\s+/g, ' ').trim().replace(/[.…\s:]+$/, '');
const isCapitals = (line: string) => /[A-Z]/.test(line) && line === line.toUpperCase();
const isSentence = (line: string) => line.split(/\s+/).length > MAX_HEADING_WORDS || /[.?!]$/.test(line.trim());
const letters = (text: string) => text.match(/\p{L}/gu)?.length ?? 0;

/** True when most of a line's letters are in its bold part (a bold tab in front of plain words does not count). */
export const isBoldLine = (text: string, boldText: string) => letters(boldText) > 0 && letters(boldText) >= letters(text) * 0.6;

export interface OutlineLine { text: string; bold?: boolean }

/**
 * `lines` are the document's paragraphs and table rows, in order, with their tabs. In a chapter where some headings are
 * bold and others are not, only the bold ones are its sections; a chapter with no bold headings lists all of them.
 */
export function parseTemplateOutline(lines: (string | OutlineLine)[]): TemplateChapter[] {
  const given = lines.map(line => typeof line === 'string' ? { text: line, bold: false } : line)
    .map(line => ({ text: line.text.replace(/\u00a0/g, ' ').trim(), bold: !!line.bold })).filter(line => line.text);
  const filled = given.map(line => line.text);
  // A table of contents: its entries end in page numbers, and a line without one continues the entry above.
  const contents = filled.filter(line => PAGE_NUMBER.test(line)).length >= filled.length * 0.4;

  const entries: { text: string; chapter: boolean; bold: boolean }[] = [];
  let previousKept = false;
  for (const { text: line, bold } of given) {
    const paged = contents && PAGE_NUMBER.test(line);
    const body = paged ? line.replace(PAGE_NUMBER, '') : line;
    const text = tidy(body);
    if (BACK_MATTER.test(text) && entries.some(entry => entry.chapter)) break;
    if (!text || NOT_A_SECTION.test(text) || /^(\d+|[ivxl]+)$/i.test(text)) { previousKept = false; continue; }

    const named = CHAPTER_WORD.exec(text);
    const numbered = NUMBER_FIRST.exec(body.trim());
    if (named) { entries.push({ text: named[2] ? text : `Chapter ${named[1]}`, chapter: true, bold }); previousKept = true; continue; }
    if (numbered && isCapitals(tidy(numbered[2]))) { entries.push({ text: tidy(numbered[2]), chapter: true, bold }); previousKept = true; continue; }

    const previous = entries[entries.length - 1];
    // "Chapter I" with its title on the next line.
    if (previousKept && previous?.chapter && /^chapter \S+$/i.test(previous.text) && isCapitals(text)) { previous.text = `${previous.text}: ${text}`; continue; }
    // A heading broken over two or more lines.
    // It carries on when the line above stops mid-phrase, or when it starts in lower case; in a table of contents also when
    // it is a last stray word ("Engagement").
    const strayWord = contents && !/\s/.test(text) && !isCapitals(text);
    if (previousKept && previous && !paged && (UNFINISHED.test(previous.text) || /^[a-z]/.test(text) || strayWord)
      && (!previous.chapter || isCapitals(text))) { previous.text = `${previous.text} ${text}`; continue; }

    if (!contents && isSentence(line)) { previousKept = false; continue; }   // instructions written under a heading
    const topLevel = bold && isCapitals(text) && TOP_LEVEL.test(text) && entries.some(entry => entry.chapter);
    entries.push({ text, chapter: topLevel, bold });
    previousKept = true;
  }

  const groups: { title: string; sections: { text: string; bold: boolean }[] }[] = [];
  const hasChapters = entries.some(entry => entry.chapter);
  let begun = false;
  for (const entry of entries) {
    if (entry.chapter) { begun = true; groups.push({ title: entry.text, sections: [] }); continue; }
    if (hasChapters && !begun && /^abstract$/i.test(entry.text)) continue;   // front matter listed before Chapter 1
    if (!groups.length) groups.push({ title: 'Template headings', sections: [] });
    groups[groups.length - 1].sections.push(entry);
  }
  const chapters: TemplateChapter[] = groups.map((group, index) => {
    // Bold tells headings apart only where some of the chapter's headings have it and some do not.
    const bold = group.sections.filter(section => section.bold);
    const listed = bold.length >= 2 && bold.length < group.sections.length ? bold : group.sections;
    return { id: `c${index + 1}`, title: group.title, sections: listed.map(section => section.text) };
  });
  return chapters.some(chapter => chapter.sections.length) ? chapters : [];
}
