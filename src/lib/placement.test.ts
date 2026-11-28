import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { placementParagraph } from './placement';

const section = 'Turnitin is an academic integrity platform used by universities. It checks originality.\nSimilarly, iThenticate scans documents against journals. It does not check coherence.';
const shown = [
  'Table of contents', 'Related Studies .... 12', 'Related Literature', 'Turnitin is mentioned here in passing by an earlier part.',
  'Related Studies',
  'Turnitin is an academic integrity platform used by universities. It checks originality.',
  'Similarly, iThenticate scans documents against journals. It does not check coherence.',
  'Synthesis',
];

test('a sentence to add at the start goes before the first paragraph of its section, not on the heading', () => {
  assert.equal(placementParagraph(shown, 'Related Studies', section, 'start'), 5);
});

test('a sentence to add at the end goes after the last paragraph of its section', () => {
  assert.equal(placementParagraph(shown, 'Related Studies', section, 'end'), 6);
});

test('a numbered or differently spaced heading is still passed over', () => {
  const numbered = shown.map(text => text === 'Related Studies' ? '2.1  RELATED STUDIES' : text);
  assert.equal(placementParagraph(numbered, 'Related Studies', section, 'start'), 5);
});

test('nothing is marked when the section text is not shown', () => {
  assert.equal(placementParagraph(['Related Studies', 'Something else entirely'], 'Related Studies', section, 'start'), -1);
  assert.equal(placementParagraph(shown, 'Related Studies', null, 'start'), -1);
});
