import { manuscriptBlocks } from './manuscriptBlocks';

type Section = { text?: string | null; blocks?: unknown };

const normalize = (value: string) => value.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();

/** Lines of 2+ cells written as "a | b | c", kept by sections saved before the Word blocks existed. */
const tableLines = (text: string) => text.split(/\r?\n/).filter(line => line.split(' | ').length > 1);

/** True when the section has a table. The results screen leaves such sections out. */
export function sectionHasTable(section: Section): boolean {
  const blocks = manuscriptBlocks(section);
  if (blocks) return blocks.some(block => block.type === 'table');
  return tableLines(section.text ?? '').length >= 2;
}

/** Every table cell and row of the manuscript, normalised, so a finding that quotes a table can be recognised. */
export function tableTexts(sections: Section[]): string[] {
  const found: string[] = [];
  for (const section of sections) {
    const blocks = manuscriptBlocks(section);
    if (blocks) {
      for (const block of blocks) if (block.type === 'table') for (const row of block.rows) { found.push(row.join(' ')); found.push(...row); }
    } else if (tableLines(section.text ?? '').length >= 2) {
      for (const line of tableLines(section.text ?? '')) { found.push(line.split(' | ').join(' ')); found.push(...line.split(' | ')); }
    }
  }
  return found.map(normalize).filter(cell => cell.length >= 8);
}

/** A sentence belongs to a table when it is, or contains, a table row or cell. */
export function quotesTable(sentence: string | null | undefined, cells: string[]): boolean {
  const text = normalize(sentence ?? '');
  return !!text && cells.some(cell => text.includes(cell) || (text.length >= 8 && cell.includes(text)));
}
