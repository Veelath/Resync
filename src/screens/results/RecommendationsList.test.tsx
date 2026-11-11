import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PairIssueCard } from './RecommendationsList';
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
