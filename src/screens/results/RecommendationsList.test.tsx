import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PairIssueCard, RecommendationsList } from './RecommendationsList';
import type { ManuscriptFlowPair } from '../../services/v7Result';

const pair = { order: 1, section_a: 'First', section_b: 'Second', culprit_sentences: { section_a: [], section_b: [] }, explanation: { link_summary: 'The text flows logically.', comparison: { a_says: 'First evidence', b_says: 'Second evidence' }, highlighted_inconsistencies: [], reference_list: [] } } as unknown as ManuscriptFlowPair;
const props = { pair, items: [{ id: '1', pair: 1, pairLabel: '', quote: null, revision: 'A revision', issue: 'An issue' }], linkedIds: new Set<string>(), onShowInManuscript: () => {}, revealId: null };

test('suggestions use fixed wording while contradictions retain their explanation and evidence', () => {
  const suggestion = renderToStaticMarkup(createElement(PairIssueCard, { ...props, severity: 'Suggestion' }));
  assert.match(suggestion, /These two parts sit side by side with nothing joining them, so a reader may feel a sudden jump\. One short sentence can fix that\./);
  assert.doesNotMatch(suggestion, /The text flows logically/);
  const contradiction = renderToStaticMarkup(createElement(PairIssueCard, { ...props, severity: 'Critical' }));
  for (const text of ['The text flows logically.', 'First evidence', 'Second evidence', 'Why this matters:', 'An issue']) assert.ok(contradiction.includes(text));
});


test('clear list shows point losses separately and excludes pairs with advice', () => {
  const makePair = (order: number, severity: ManuscriptFlowPair['severity'] = 'None') => ({ ...pair, order, section_a: `Part ${order}`, section_b: `Part ${order + 1}`, severity, scores: { overall_coherence: 1 } });
  const markup = renderToStaticMarkup(createElement(RecommendationsList, {
    pairs: [makePair(1), makePair(3), makePair(5, 'Minor'), makePair(7)],
    items: [{ ...props.items[0], pair: 7 }], linkedIds: new Set<string>(), onShowInManuscript: () => {}, revealId: null, mode: 'clear',
    breakdown: { context_alignment: { failures: [{ order: 1, credit: 0.5 }, { order: 5 }] } } as any,
  }));
  assert.match(markup, /Small issues that cost points/);
  assert.match(markup, /Part 1 and Part 2: Context Alignment/);
  assert.match(markup, /Part 5 and Part 6: Context Alignment/);
  assert.match(markup, /No change is required; this only lowered the score slightly/);
  assert.match(markup, /Part 3/);
  assert.doesNotMatch(markup, /Part 7/);
});
