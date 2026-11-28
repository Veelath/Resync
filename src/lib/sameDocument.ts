// Is a file the student attaches to a report the manuscript that was scanned? The report must never show another paper.
const squash = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const SNIPPET = 80;
const MAX_SECTIONS = 8;

/** `fileText` is the file's text; `sections` the report's. True when most sections' opening words are in the file. */
export function sameDocument(fileText: string, sections: { text?: string | null }[]): boolean {
  const whole = squash(fileText);
  const openings = sections.map(section => squash(section.text ?? '').slice(0, SNIPPET)).filter(opening => opening.length >= 30).slice(0, MAX_SECTIONS);
  return openings.length > 0 && openings.filter(opening => whole.includes(opening)).length * 2 > openings.length;
}
