import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { contentsRange } from './contentsPage';
import { placementParagraph } from './placement';

const body = 'This chapter presents a comprehensive summary of the research, the findings and the conclusions that the researchers drew from the data gathered from all of the respondents.';
const shown = ['ABSTRACT', body, 'TABLE OF CONTENTS', 'Page', '3 SUMMARY, FINDINGS, CONCLUSIONS AND 101', 'RECOMMENDATIONS',
  'Summary 101', 'Findings 103', 'Conclusion 105', 'Recommendations 107', 'Proposed Action Plan 109',
  'CHAPTER 3', 'Summary', body, 'Recommendations', 'The following recommendations are proposed based on the findings of the study.'];

test('the contents page runs from its title to its last numbered line', () => {
  assert.deepEqual(contentsRange(shown), [2, 10]);
  assert.equal(contentsRange(['Introduction', body, 'Methodology']), null);
});

test('a sentence to add is never placed on the contents page', () => {
  assert.equal(placementParagraph(shown, 'Recommendations', 'Proposed Action Plan 109', 'start'), -1);
  assert.equal(placementParagraph(shown, 'Recommendations', 'The following recommendations are proposed based on the findings of the study.', 'start'), 15);
});
