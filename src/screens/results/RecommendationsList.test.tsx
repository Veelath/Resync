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
  assert.match(markup, /Part 1 and Part 2<\/span>: Context Alignment/);
  assert.match(markup, /Part 5 and Part 6<\/span>: Context Alignment/);
  assert.match(markup, /No change is required; this only lowered the score/);
  assert.match(markup, /Part 3/);
  assert.doesNotMatch(markup, /Part 7/);
});

const weak = (order: number, rating: number, reason?: string) => ({
  ...pair, order, section_a: `Part ${order}`, section_b: `Part ${order + 1}`, severity: 'None' as ManuscriptFlowPair['severity'],
  scores: { ...pair.scores, overall_coherence: rating }, explanation: reason ? { ...pair.explanation, link_summary: reason } : { ...pair.explanation, link_summary: undefined },
}) as unknown as ManuscriptFlowPair;
const failures = (...orders: number[]) => ({ context_alignment: { failures: orders.map(order => ({ order })) } } as any);

test('the pairs that cost points are listed weakest first with the reason the AI gave', () => {
  const markup = renderToStaticMarkup(createElement(RecommendationsList, {
    pairs: [weak(1, 0.45, 'Part 1 stops at the method but Part 2 starts with the survey.'), weak(3, 0.2, 'Part 3 is about coding while Part 4 is about the survey.')],
    items: [], linkedIds: new Set<string>(), onShowInManuscript: () => {}, revealId: null, mode: 'clear', breakdown: failures(1, 3),
  }));
  assert.ok(markup.indexOf('Part 3 and Part 4') < markup.indexOf('Part 1 and Part 2'));   // the lowest rating comes first
  assert.match(markup, /Part 3 is about coding while Part 4 is about the survey\./);
  assert.match(markup, /Part 1 stops at the method but Part 2 starts with the survey\./);
});

test('with no recommendations the Recommendations tab shows the three weakest connections instead of an empty list', () => {
  const pairs = [weak(1, 0.45, 'Reason one.'), weak(3, 0.2, 'Reason three.'), weak(5, 0.3, 'Reason five.'), weak(7, 0.4, 'Reason seven.')];
  const markup = renderToStaticMarkup(createElement(RecommendationsList, {
    pairs, items: [], linkedIds: new Set<string>(), onShowInManuscript: () => {}, revealId: null, mode: 'issues', breakdown: failures(1, 3, 5, 7),
  }));
  assert.match(markup, /No recommendations\. The weakest connections that cost points/);
  assert.doesNotMatch(markup, /No recommendations to show/);
  assert.ok(markup.includes('Reason three.') && markup.includes('Reason five.') && markup.includes('Reason seven.'));
  assert.ok(!markup.includes('Reason one.'));   // only the three weakest
});
