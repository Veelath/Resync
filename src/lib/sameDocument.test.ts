import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { sameDocument } from './sameDocument';

const sections = [
  { text: 'Leadership plays a critical role in shaping the learning environment of nursing students today.' },
  { text: 'This study used a descriptive correlational research design to measure the two variables.' },
  { text: 'The following recommendations are proposed based on the findings and conclusion of the study.' },
];

test('the scanned file is recognised whatever its spacing and line breaks', () => {
  const file = 'Title page\n' + sections.map(section => section.text.replace(/ /g, '  ')).join('\nsomething between\n');
  assert.equal(sameDocument(file, sections), true);
});

test('another paper is not shown in its place', () => {
  assert.equal(sameDocument('A completely different manuscript about coastal erosion and its effects on fishing towns.', sections), false);
  assert.equal(sameDocument(sections[0].text, sections), false);   // one shared passage is not enough
  assert.equal(sameDocument('anything', []), false);
});
