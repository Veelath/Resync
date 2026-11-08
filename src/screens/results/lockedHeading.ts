// Ambiguous matches use the server-provided withheld view instead of guessing a boundary.
export function lockedHeadingIndex(paragraphs: string[], section: string): number {
  const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  const stripNumber = (value: string) => value.replace(/^(?:chapter\s+)?(?:\d+(?:\s+\d+)*|[ivxlcdm]+)\s+/i, '');
  const target = stripNumber(normalize(section));
  if (!target) return -1;
  let match = -1;
  for (let i = 0; i < paragraphs.length; i++) {
    const text = normalize(paragraphs[i]);
    if (text === target || stripNumber(text) === target) {
      if (match !== -1) return -1;
      match = i > 0 && /^chapter\s+(?:\d+|[ivxlcdm]+)$/i.test(normalize(paragraphs[i - 1])) ? i - 1 : i;
    }
  }
  return match;
}
