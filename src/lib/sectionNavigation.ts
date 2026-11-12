const normalize = (value: string) => value.trim()
  .replace(/^(?:(?:chapter|part|section)\s+)?(?:\d+(?:\.\d+)*|[ivxlcdm]+)(?:[\s:.)\-–—]+|$)/i, '')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');

export type Placement = 'start' | 'end';

export function isWithheldSection(locked: boolean, index: number): boolean {
  return locked && index > 0;
}

export function edgeSentence(text: string | null | undefined, placement: Placement, max = 170): string {
  const sentences = (text ?? '').split(/(?<=[.!?])\s+|\n+/).map(item => item.trim()).filter(item => item.split(/\s+/).length >= 4);
  const sentence = (placement === 'end' ? sentences[sentences.length - 1] : sentences[0]) ?? '';
  return sentence.length > max ? (placement === 'end' ? `…${sentence.slice(-max).trimStart()}` : `${sentence.slice(0, max).trimEnd()}…`) : sentence;
}

export function findSectionIndex(names: string[], section: string): number {
  const target = normalize(section);
  if (!target) return -1;
  const exact = names.map((name, index) => name.trim().toLowerCase() === section.trim().toLowerCase() ? index : -1).filter(index => index >= 0);
  if (exact.length) return exact.length === 1 ? exact[0] : -1;
  const matches = names.map((name, index) => normalize(name) === target ? index : -1).filter(index => index >= 0);
  return matches.length === 1 ? matches[0] : -1;
}
