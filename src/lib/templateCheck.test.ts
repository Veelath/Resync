import { test } from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeTemplate } from './templateCheck';

test('a school template with chapter headings is accepted, however it is numbered', () => {
  assert.equal(looksLikeTemplate(['CHAPTER 1: INTRODUCTION', 'Background of the Study', 'Statement of the Problem',
    'CHAPTER II', 'Review of Related Literature', 'Chapter III - Methodology', 'Research Design', 'References']), true);
  assert.equal(looksLikeTemplate(['1. Introduction', '2. Methods', '3. Results and Discussion', '4. Conclusion'], true), true);
  // Instructions under the headings do not count against a Word template.
  assert.equal(looksLikeTemplate(['Introduction', 'Write two to three pages that describe the setting of your study and why it matters to you.',
    'Methodology', 'Describe your design.', 'Summary, Conclusions and Recommendations']), true);
});

test('a manual, a study guide, a résumé and a questionnaire are not templates', () => {
  assert.equal(looksLikeTemplate(['Capstone Defense Study Guide', 'System Architecture', 'How recommendations are produced',
    'Findings, evidence and verification rules', 'Honest limitations', 'Likely panel questions']), false);
  assert.equal(looksLikeTemplate(['Education', 'Skills', 'Work Experience', 'References']), false);
  assert.equal(looksLikeTemplate(['Objectives', 'Methodology', 'Results', 'How was the data gathered?', 'Which design fits?']), false);
  assert.equal(looksLikeTemplate(['1. What is your role in research evaluation?', '2. How long have you reviewed papers?']), false);
  assert.equal(looksLikeTemplate(['5. Recommendation is RAID 10', 'RAID Configuration Analysis', 'Backup Schedule']), false);
});

test('headings without a methodology, or too few of them, are not enough', () => {
  assert.equal(looksLikeTemplate(['Introduction', 'Results', 'Conclusion', 'References']), false);
  assert.equal(looksLikeTemplate(['Introduction', 'Methodology']), false);
  assert.equal(looksLikeTemplate([]), false);
});

test('a text file that is mostly sentences is not a template', () => {
  const story = ['Introduction', 'Methodology', 'Results', 'The dog ran home.', 'It was raining hard that night.',
    'Nobody saw it leave.', 'We looked for it everywhere.', 'It came back in the morning.', 'Everyone was glad.', 'The end.', 'Really, that was all.'];
  assert.equal(looksLikeTemplate(story, true), false);
});
