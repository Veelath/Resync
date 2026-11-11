import type { ManuscriptFlowPair, V7ScanResponse } from '../../services/v7Result';
import { findSectionIndex } from '../../lib/sectionNavigation';

export type Sections = NonNullable<V7ScanResponse['manuscript_sections']>;

function sectionIndex(names: string[], name: string): number {
  const exact = names.map((value, index) => value.trim().toLowerCase() === name.trim().toLowerCase() ? index : -1).filter(index => index >= 0);
  return exact.length === 1 ? exact[0] : exact.length ? -1 : findSectionIndex(names, name);
}

export function sectionDisplayName(name: string, sections: Sections = []): string {
  const index = sectionIndex(sections.map(section => section.name), name);
  const display = index < 0 ? name : sections[index].display_name?.trim() || sections[index].name;
  if (display !== display.toLowerCase() && display !== display.toUpperCase()) return display;
  return display.toLowerCase().replace(/[a-z]+(?:['?][a-z]+)?/g, (word, offset: number) =>
    offset > 0 && /^(of|the|and|to|in|for|on|a|an)$/.test(word) ? word : word[0].toUpperCase() + word.slice(1));
}

export function usablePair(pair: ManuscriptFlowPair, sections: Sections = []): boolean {
  const names = sections.map(section => section.name);
  const a = sectionIndex(names, pair.section_a);
  const b = sectionIndex(names, pair.section_b);
  if (!pair.section_a.trim() || !pair.section_b.trim() || sectionIndex([pair.section_a], pair.section_b) === 0 || (a >= 0 && a === b)) return false;
  if ([pair.section_a, pair.section_b].some(name => /^chapter\b/i.test(name.trim()) && /(?:\.{2,}|\s{2,})\s*\d+\s*$/m.test(name))) return false;
  return [a, b].every(index => {
    if (index < 0) return true; // Older reports may not store sections.
    const section = sections[index];
    const text = section.text;
    if (typeof text === 'string' && !text.trim() && !section.blocks?.length) return false;
    return !(/^chapter\b/i.test(section.name.trim()) && /(?:\.{2,}|\s{2,})\s*\d+\s*$/m.test(`${section.name}\n${text ?? ''}`));
  });
}

export const severityRank = (severity: ManuscriptFlowPair['severity']) => ({ Critical: 0, Moderate: 1, Minor: 2, None: 3 }[severity ?? 'None']);

export function cardHeading(a: string, b: string, suggestion: boolean): string {
  return `${a} and ${b} ${suggestion ? 'need a clearer connection' : 'may not agree'}.`;
}
