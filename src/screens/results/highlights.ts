// Match the backend's verified quotes across whitespace and smart/straight quote differences.
export function verifiedQuoteRanges(text: string, quotes: string[]): { start: number; end: number }[] {
  const normalize = (value: string) => value.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').toLowerCase();
  let normalized = '';
  const starts: number[] = [];
  const ends: number[] = [];
  for (let i = 0; i < text.length;) {
    const char = text[i];
    const next = /\s/.test(char) ? i + (text.slice(i).match(/^\s+/)?.[0].length ?? 1) : i + 1;
    const clean = normalize(text.slice(i, next));
    for (const letter of clean) {
      normalized += letter;
      starts.push(i);
      ends.push(next);
    }
    i = next;
  }
  return quotes.flatMap(quote => {
    const needle = normalize(quote.trim());
    if (!needle) return [];
    const at = normalized.indexOf(needle);
    return at < 0 ? [] : [{ start: starts[at], end: ends[at + needle.length - 1] }];
  }).sort((a, b) => a.start - b.start).filter((range, index, all) => index === 0 || range.start >= all[index - 1].end);
}
