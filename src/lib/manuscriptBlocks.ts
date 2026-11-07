export type ManuscriptItem = { type: 'paragraph'; text: string } | { type: 'table'; rows: string[][] };

export function sectionHeading(section: { name: string; display_name?: string | null }): string {
  return section.display_name ?? section.name;
}

export function manuscriptBlocks(section: { blocks?: unknown }): ManuscriptItem[] | null {
  if (!Array.isArray(section.blocks)) return null;
  const items: ManuscriptItem[] = [];
  for (const value of section.blocks) {
    if (!value || typeof value !== 'object') continue;
    const block = value as { type?: unknown; text?: unknown; rows?: unknown };
    if (block.type === 'paragraph' && typeof block.text === 'string') items.push({ type: 'paragraph', text: block.text });
    if (block.type === 'table' && Array.isArray(block.rows)) {
      const rows = block.rows.slice(0, 200).map(row => (Array.isArray(row) ? row : []).slice(0, 20).map(cell => {
        const text = String(cell ?? '');
        return text.length > 500 ? `${text.slice(0, 499)}…` : text;
      }));
      const width = Math.max(0, ...rows.map(row => row.length));
      items.push({ type: 'table', rows: rows.map(row => [...row, ...Array(width - row.length).fill('')]) });
    }
  }
  return items;
}

export function hasTableHeader(rows: string[][]): boolean {
  return rows.length > 1 && rows[0].length > 0 && rows[0].every(cell => cell.trim().length > 0 && cell.length <= 30 && !/\d/.test(cell))
    && rows[1].some(cell => /\d/.test(cell) || cell.length > 30);
}
