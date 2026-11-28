import { MAX_ELEMENTS } from '../../lib/docxPreview';

const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
const stripNumber = (value: string) => value.replace(/^(?:chapter\s+)?(?:\d+(?:\s+\d+)*|[ivxlcdm]+)\s+/i, '');

const PAGE_NUMBERED = /(?:\d{1,3}|\s[ivxlc]{1,7})\s*\|?\s*$/i;   // a contents line ends in its page number
const CHAPTER_LINE = /^chapter\s+(?:\d+|[ivxlcdm]+)$/i;
const HEADINGS_ABOVE_BODY = 4;

/** Where the body of a paper starts: after the table of contents and the lists of tables and figures, which are all short lines. */
export function bodyStartIndex(paragraphs: string[]): number {
  const contents = paragraphs.findIndex(text => /^(?:table of )?contents$/.test(normalize(text)));
  if (contents < 0) return 0;
  for (let i = contents + 1; i < paragraphs.length; i++) {
    if (paragraphs[i].trim().length < 100) continue;
    // The headings right above the first paragraph ("CHAPTER 1", "Rationale of the Study") are part of the body too.
    let start = i;
    for (let back = i - 1, headings = 0; back > contents && headings < HEADINGS_ABOVE_BODY; back--) {
      const text = paragraphs[back].trim();
      if (!text) continue;
      if (PAGE_NUMBERED.test(text) && !CHAPTER_LINE.test(text)) break;
      start = back;
      headings++;
    }
    return start;
  }
  return paragraphs.length;   // only the contents page has been read so far: its lines are not headings
}

// Ambiguous matches use the server-provided withheld view instead of guessing a boundary.
export function lockedHeadingIndex(paragraphs: string[], section: string): number {
  const target = stripNumber(normalize(section));
  if (!target) return -1;
  let match = -1;
  for (let i = bodyStartIndex(paragraphs); i < paragraphs.length; i++) {
    const text = normalize(paragraphs[i]);
    // a heading may share its paragraph with the line break and sub-heading after it
    const startsWith = text.length <= target.length + 60 && (text.startsWith(`${target} `) || stripNumber(text).startsWith(`${target} `));
    if (text === target || stripNumber(text) === target || startsWith) {
      if (match !== -1) return -2;
      match = i > 0 && /^chapter\s+(?:\d+|[ivxlcdm]+)$/i.test(normalize(paragraphs[i - 1])) ? i - 1 : i;
    }
  }
  return match;
}

export function lockedHeadingAction(index: number, truncated: boolean, budget: number): 'show' | 'retry' | 'fail' {
  if (index >= 0) return 'show';
  return index === -1 && truncated && budget < MAX_ELEMENTS ? 'retry' : 'fail';
}
