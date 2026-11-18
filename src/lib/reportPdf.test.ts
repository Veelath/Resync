import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReportPdf, pairPoints, pdfSafe, sectionScores, RESYNC_SITE } from './reportPdf';
import sample from '../data/sampleResult.json';

const result: any = sample;
const text = (locked = false) => buildReportPdf(result, 'A Sample Thesis', [{ ref: 'Smith (2020). A paper.', status: 'public' }], locked).output();

test('the score report comes first and the manuscript text follows it', () => {
  const pdf = text();
  const order = ['Score by category', 'Scores by section', 'Findings', 'Recommendations', 'Citations', 'Manuscript text'].map(label => pdf.indexOf(label));
  assert.ok(order.every(position => position >= 0), `every part is present: ${order}`);
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'the parts appear in this order');
});

test('the report links only to the Resync site and has no Team Resync label', () => {
  const pdf = text();
  assert.ok(!pdf.includes('Report by Team Resync'));
  assert.ok(pdf.includes(RESYNC_SITE));
  const links = [...pdf.matchAll(/\/URI \((.*?)\)/g)].map(match => match[1]);
  assert.ok(links.length > 0 && links.every(link => link === RESYNC_SITE), `only the Resync link: ${links.slice(0, 3)}`);
  assert.ok(!pdf.includes(result.analysis_run_id) && !pdf.includes('/results/'), 'the report address is not in the file');
});

test('a locked preview says so and still builds', () => {
  assert.ok(text(true).includes('preview'));
});

test('characters the standard PDF fonts cannot draw are swapped, not lost silently', () => {
  assert.equal(pdfSafe('A → B ≥ 5, β = .3 “quoted” – dash'), 'A -> B >= 5, beta = .3 “quoted” – dash');
  assert.equal(pdfSafe('日本語'), '???');
});

test('a section scores by the points of the checks it takes part in, like the score does', () => {
  const pair = (over: any) => ({ order: 1, section_a: 'a', section_b: 'b', adjacent: true, numeric_applicable: false, severity: 'None', failed_dimension: 'none',
    scores: { objectives_alignment: 0.9, methodology_fit: 0.9, claim_support: 0.9, numeric_consistency: 0.9, overall_coherence: 0.9 }, ...over }) as any;
  assert.deepEqual(pairPoints(pair({})), { earned: 3, total: 3 });
  assert.deepEqual(pairPoints(pair({ severity: 'Minor', failed_dimension: 'claim_support' })), { earned: 2.5, total: 3 });
  assert.deepEqual(pairPoints(pair({ severity: 'Critical', failed_dimension: 'claim_support' })), { earned: 2, total: 3 });
  assert.equal(pairPoints(pair({ scores: { overall_coherence: null } })), null);
  const scores = sectionScores([pair({}), pair({ order: 2, section_b: 'c', severity: 'Critical', failed_dimension: 'claim_support' })]);
  assert.deepEqual(scores.map(item => [item.name, item.score]), [['a', 83.33], ['b', 100], ['c', 66.67]]);
});
