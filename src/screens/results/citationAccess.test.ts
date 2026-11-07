import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citationAccess, citationHasNoLink, citationLinkRange } from './helpers';
import type { CitationReport } from '../../services/api';

const cases: [string, Partial<CitationReport>, 'public' | 'private', boolean][] = [
  ['DOI only', { citation_raw_reference_text: 'doi:10.1000/example', citation_status: 'accessible', citation_is_accessible: true }, 'public', false],
  ['URL only', { citation_raw_reference_text: 'https://example.com/ok', citation_status: 'accessible', citation_is_accessible: true }, 'public', false],
  ['404 broken', { citation_status: 'broken', citation_is_accessible: false }, 'private', false],
  ['403 blocked', { citation_status: 'bot_wall', citation_is_accessible: true }, 'public', false],
  ['redirect ok', { citation_status: 'accessible', citation_is_accessible: true }, 'public', false],
  ['no_link', { citation_status: 'no_link', citation_is_accessible: true }, 'private', true],
  ['personal communication', { citation_raw_reference_text: 'A. Person, personal communication.', citation_status: 'NO-LINK', citation_is_accessible: true }, 'private', true],
  ['book without URL', { citation_raw_reference_text: 'Author (2020). Printed book.', citation_status: 'no link', citation_is_accessible: true }, 'private', true],
  ['legacy without link', { citation_is_accessible: true }, 'private', true],
  ['legacy URL in text', { citation_raw_reference_text: 'See https://example.com/a', citation_is_accessible: true }, 'public', false],
  ['legacy DOI in text', { citation_raw_reference_text: 'See 10.1000/example', citation_is_accessible: true }, 'public', false],
  ['legacy stored link', { citation_primary_link: 'example.com/a', citation_is_accessible: true }, 'public', false],
  ['unknown status', { citation_status: 'other', citation_is_accessible: true }, 'public', false],
];

test('citation status, legacy links and counts', () => {
  const counts = { public: 0, private: 0 };
  for (const [name, input, expected, noLink] of cases) {
    const citation = { citation_raw_reference_text: 'A reference.', citation_is_accessible: false, ...input };
    assert.equal(citationAccess(citation), expected, name);
    assert.equal(citationHasNoLink(citation), noLink, name);
    counts[citationAccess(citation)]++;
  }
  assert.equal(counts.public + counts.private, cases.length);
  assert.deepEqual(counts, { public: 8, private: 5 });
});

test('links already in references are linked in place', () => {
  assert.deepEqual(citationLinkRange('See 10.1000/example today', 'https://doi.org/10.1000/example'), [4, 19]);
  assert.deepEqual(citationLinkRange('See https://example.com/a', 'https://example.com/a'), [4, 25]);
  assert.equal(citationLinkRange('No link here', 'https://example.com/a'), null);
});
