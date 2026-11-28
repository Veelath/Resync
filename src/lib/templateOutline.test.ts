import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBoldLine, parseTemplateOutline } from './templateOutline';

test('a table of contents typed with tabs and page numbers gives its chapters and sections', () => {
  const chapters = parseTemplateOutline([
    'CHAPTER',
    '1    \tTHE PROBLEM AND ITS SCOPE       \t   \t1',
    '                           \tINTRODUCTION                          \t   \t1',
    '                                     \tRationale of the Study           \t   \t1',
    'Statement of the Problem       \t      \t     \t       45',
    'RESEARCH METHODOLOGY \t                 \t  \t52',
    'Research Design                     \t      \t \t \t      52',
    '2    \tPRESENTATION, ANALYSIS, AND    \t                 \t      67',
    'INTERPRETATION OF DATA',
    '      \tResult of the Test of Hypothesis on the                  \t      93',
    'Significant Relationship between the',
    'Respondents’ Profile and The Level of',
    'Students’ Learning Engagement',
    ' ',
    '3    \tSUMMARY, FINDINGS, CONCLUSIONS AND     \t101',
    'RECOMMENDATIONS',
    '      \tProposed Action Plan                                           \t\t109',
  ]);
  assert.deepEqual(chapters.map(chapter => chapter.title), ['THE PROBLEM AND ITS SCOPE',
    'PRESENTATION, ANALYSIS, AND INTERPRETATION OF DATA', 'SUMMARY, FINDINGS, CONCLUSIONS AND RECOMMENDATIONS']);
  assert.deepEqual(chapters[0].sections, ['INTRODUCTION', 'Rationale of the Study', 'Statement of the Problem', 'RESEARCH METHODOLOGY', 'Research Design']);
  assert.deepEqual(chapters[1].sections, ['Result of the Test of Hypothesis on the Significant Relationship between the Respondents’ Profile and The Level of Students’ Learning Engagement']);
  assert.deepEqual(chapters[2].sections, ['Proposed Action Plan']);
});

test('a table of contents in a table, with chapter titles in their own cell', () => {
  const chapters = parseTemplateOutline(['TABLE OF CONTENTS\t', 'ACKNOWLEDGEMENT\tI', 'DEDICATION\tII',
    'CHAPTER I\tINTRODUCTION\t1', 'Rationale of the Study\t1', 'Objectives of the Study\t3',
    'CHAPTER III\tRESEARCH METHODOLOGY\t23', 'Software Engineering Methodology\t23', 'Unit Testing', 'Integration Testing']);
  assert.deepEqual(chapters.map(chapter => chapter.title), ['CHAPTER I INTRODUCTION', 'CHAPTER III RESEARCH METHODOLOGY']);
  assert.deepEqual(chapters[0].sections, ['Rationale of the Study', 'Objectives of the Study']);
  // Entries without a page number stay separate headings.
  assert.deepEqual(chapters[1].sections, ['Software Engineering Methodology', 'Unit Testing', 'Integration Testing']);
});

test('a plain outline without page numbers leaves instructions out', () => {
  const chapters = parseTemplateOutline(['Chapter 1', 'INTRODUCTION', 'Background of the Study',
    'Write two pages about the setting of your study.', 'Chapter 2: Methodology', 'Research Design', 'Phase 2']);
  assert.deepEqual(chapters.map(chapter => chapter.title), ['Chapter 1: INTRODUCTION', 'Chapter 2: Methodology']);
  assert.deepEqual(chapters[0].sections, ['Background of the Study']);
  assert.deepEqual(chapters[1].sections, ['Research Design', 'Phase 2']);
});

test('in a chapter with bold and plain headings only the bold ones are sections', () => {
  const bold = (text: string) => ({ text, bold: true });
  const chapters = parseTemplateOutline([bold('CHAPTER'), bold('1    \tTHE PROBLEM AND ITS SCOPE\t1'), bold('INTRODUCTION\t1'),
    'Rationale of the Study\t1', bold('RESEARCH METHODOLOGY\t52'), 'Research Design\t52',
    bold('2    \tPRESENTATION OF DATA\t67'), 'Profile of the Respondents\t68']);
  assert.deepEqual(chapters.map(chapter => [chapter.title, chapter.sections]), [
    ['THE PROBLEM AND ITS SCOPE', ['INTRODUCTION', 'RESEARCH METHODOLOGY']], ['PRESENTATION OF DATA', ['Profile of the Respondents']]]);
});

test('a template that is all bold, or has no bold, keeps every section', () => {
  for (const bold of [true, false]) {
    const chapters = parseTemplateOutline(['Chapter 1: Introduction', 'Background of the Study', 'Objectives'].map(text => ({ text, bold })));
    assert.deepEqual(chapters[0].sections, ['Background of the Study', 'Objectives']);
  }
});

test('a line is bold only when its words are', () => {
  assert.equal(isBoldLine('RESEARCH METHODOLOGY \t 52', 'RESEARCH METHODOLOGY \t '), true);
  assert.equal(isBoldLine('   \tRationale of the Study\t1', '   \t'), false);
});

test('bold chapter lines keep their plain sections; bold back-matter headings stand alone; appendices end it', () => {
  const bold = (text: string) => ({ text, bold: true });
  const chapters = parseTemplateOutline([bold('TABLE OF CONTENTS'), 'Page No.', bold('ABSTRACT \ti'), bold('LIST OF TABLES\tv'),
    bold('CHAPTER I           INTRODUCTION\t1'), '        Rationale of the Study\t1', 'Definition of Terms\t7',
    bold('CHAPTER III       RESEARCH METHODOLOGY\t21'), 'Software Engineering Methodology\t21', 'Project Road Map\t189',
    bold('FINDINGS\t190'), bold('CONCLUSION\t192'), bold('REFERENCES\t195'), bold('APPENDICES\t198'),
    'APPENDIX A - Consultation Logs\t198', bold('LIST OF TABLES'), '1\tComparative Matrix\t15']);
  assert.deepEqual(chapters.map(chapter => [chapter.title, chapter.sections]), [
    ['CHAPTER I INTRODUCTION', ['Rationale of the Study', 'Definition of Terms']],
    ['CHAPTER III RESEARCH METHODOLOGY', ['Software Engineering Methodology', 'Project Road Map']],
    ['FINDINGS', []], ['CONCLUSION', []], ['REFERENCES', []]]);
});

test('nothing to list gives nothing', () => {
  assert.deepEqual(parseTemplateOutline([]), []);
  assert.deepEqual(parseTemplateOutline(['CHAPTER', 'PAGE']), []);
});
