import { MAX_ELEMENTS } from '../../lib/docxPreview';

const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
const stripNumber = (value: string) => value.replace(/^(?:chapter\s+)?(?:\d+(?:\s+\d+)*|[ivxlcdm]+)\s+/i, '');

/** Where the body of a paper starts: after the table of contents and the lists of tables and figures, which are all short lines. */
export function bodyStartIndex(paragraphs: string[]): number {
  const contents = paragraphs.findIndex(text => /^(?:table of )?contents$/.test(normalize(text)));
  if (contents < 0) return 0;
  for (let i = contents + 1; i < paragraphs.length; i++) if (paragraphs[i].trim().length >= 100) return i;
  return 0;
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
