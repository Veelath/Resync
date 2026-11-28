import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { markLayout, planBreaks, type Block, type Span } from './pagePlan';

const lines = (top: number, count: number): Span[] => Array.from({ length: count }, (_, i) => ({ top: top + i * 10, bottom: top + (i + 1) * 10 }));
const paragraph = (top: number, count: number): Block => ({ top, bottom: top + count * 10, parts: lines(top, count) });

test('nothing is cut when everything fits on one page', () => {
  assert.deepEqual(planBreaks([paragraph(0, 4), paragraph(40, 6)], 100, 0), []);
});

test('a paragraph that runs past the page is cut at the first line that does not fit', () => {
  assert.deepEqual(planBreaks([paragraph(0, 4), paragraph(40, 10)], 100, 0), [{ block: 1, part: 6 }]);
});

test('a long paragraph is cut once for every page it fills', () => {
  assert.deepEqual(planBreaks([paragraph(0, 25)], 100, 0), [{ block: 0, part: 10 }, { block: 0, part: 20 }]);
});

test('a single line is never left alone at the foot or the head of a page', () => {
  assert.deepEqual(planBreaks([paragraph(0, 9), paragraph(90, 5)], 100, 0), [{ block: 1 }]);       // one line would stay behind
  assert.deepEqual(planBreaks([paragraph(0, 4), paragraph(40, 7)], 100, 0), [{ block: 1, part: 5 }]); // two lines go over, not one
});

test('a heading moves to the next page with the text under it', () => {
  const heading: Block = { ...paragraph(90, 1), heading: true };
  assert.deepEqual(planBreaks([paragraph(0, 9), heading, paragraph(100, 6)], 100, 0), [{ block: 1 }]);
});

test('a table is cut between rows, and something taller than a page that cannot be cut is left whole', () => {
  const table: Block = { top: 80, bottom: 200, rows: true, parts: [{ top: 80, bottom: 120 }, { top: 120, bottom: 160 }, { top: 160, bottom: 200 }] };
  assert.deepEqual(planBreaks([paragraph(0, 8), table], 100, 0), [{ block: 1 }, { block: 1, part: 2 }]);
  assert.deepEqual(planBreaks([{ top: 0, bottom: 300 }, paragraph(300, 2)], 100, 0), [{ block: 1 }]);
});

test('empty lines that run past the foot of a page do not push the next page down', () => {
  const blank = (top: number): Block => ({ top, bottom: top + 10, blank: true });
  const absorbed = new Set<number>();
  assert.deepEqual(planBreaks([paragraph(0, 9), blank(90), blank(100), blank(110), paragraph(120, 4)], 100, 0, absorbed), [{ block: 4 }]);
  assert.deepEqual([...absorbed], [2, 3]);
});

test('a heading that opens a page starts one even when there is room left', () => {
  const chapter: Block = { ...paragraph(40, 1), startsPage: true };
  assert.deepEqual(planBreaks([paragraph(0, 4), chapter, paragraph(50, 3)], 100, 0), [{ block: 1 }]);
});

test('continuous section breaks are marked, headers are passed on, and right-hand tab lines are noted', () => {
  type Part = { type: string; className?: string; sectionProps?: { type?: string; headerRefs?: string[] }; tabs?: { style: string }[]; children: never[] };
  const end = (type: string | undefined, headerRefs?: string[]): Part => ({ type: 'paragraph', sectionProps: { type, headerRefs }, children: [] });
  const entry: Part = { type: 'paragraph', className: 'x', tabs: [{ style: 'right' }], children: [] };
  const body = { children: [end(undefined, ['a']), end('continuous'), entry, end('nextPage', ['b'])], props: { type: 'continuous' } as { type: string; headerRefs?: string[] } };
  markLayout(body);
  // the 1st is followed by a continuous section, the 2nd by a new page, the last by the continuous closing section
  assert.deepEqual(body.children.map(child => child.className), ['docx-continues', undefined, 'x docx-right-tab', 'docx-continues']);
  assert.deepEqual([body.children[1].sectionProps?.headerRefs, body.props.headerRefs], [['a'], ['b']]);
});
