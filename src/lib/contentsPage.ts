// The lines of a manuscript's contents page. A highlight or an "add it here" spot must never land on them: they repeat
// the headings and say nothing the paper claims. Same rule as the backend's parser.
const TITLE = /^\s*(table\s+of\s+contents|contents)\s*$/i;
const NUMBERED = /\s(\d{1,3}|[ivxlc]{1,7})\s*\|?\s*$/i;
const CHAPTER_HEADING = /^\s*chapter\s+(\d{1,2}|[ivxl]{1,5})\s*$/i;   // "CHAPTER 3" opens the body; its 3 is no page number
const PARAGRAPH_WORDS = 25;
const MIN_ENTRIES = 5;

/** `paragraphs` are the shown paragraphs in order. Returns [first, last] of the contents page, or null when there is none. */
export function contentsRange(paragraphs: string[]): [number, number] | null {
  const limit = Math.max(1, Math.floor(paragraphs.length * 2 / 5));
  for (let start = 0; start < limit; start++) {
    if (!TITLE.test(paragraphs[start])) continue;
    let last = start, count = 0;
    for (let index = start + 1; index < paragraphs.length; index++) {
      if (NUMBERED.test(paragraphs[index]) && !CHAPTER_HEADING.test(paragraphs[index])) { last = index; count++; }
      else if (paragraphs[index].trim().split(/\s+/).length >= PARAGRAPH_WORDS) break;
    }
    if (count >= MIN_ENTRIES) return [start, last];
  }
  return null;
}

// A section that is mostly "Heading <tab> page" lines was read from the contents page, not from the paper. Reports made
// before the parser skipped those pages still hold such sections.
const CONTENTS_ENTRY = /(\t|\.{4,}| {4,})\s*(\d{1,3}|[ivxlc]{1,7})\s*$/i;

/** The names of the sections that were read from a contents page. */
export function contentsSections(sections: { name: string; text?: string | null }[]): Set<string> {
  return new Set(sections.filter(section => {
    const lines = (section.text ?? '').split('\n').filter(line => line.trim());
    const entries = lines.filter(line => CONTENTS_ENTRY.test(line)).length;
    return entries >= 3 && entries * 4 >= lines.length;
  }).map(section => section.name));
}
