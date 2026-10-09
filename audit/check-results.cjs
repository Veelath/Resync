const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync('src/App.tsx', 'utf8');
const helpers = source.slice(source.indexOf('const SECTION_STATUS'), source.indexOf('function ResultsScreen'));
const context = vm.createContext({});
vm.runInContext(ts.transpile(helpers), context);
const sections = (topics, detected, missing, text) => context.buildReportSections(topics, detected, missing, text);
for (const [words, status] of [[0, 'Unassessed'], [1, 'Stub'], [39, 'Stub'], [40, 'Present']]) {
  assert.equal(sections(['Methodology'], ['methodology'], [], 'Methodology\n' + Array(words).fill('word').join(' '))[0].status, status);
}
assert.equal(sections(['Objectives'], [], ['objectives'], 'Introduction\nUnrelated content')[0].status, 'Missing');
assert.equal(sections(['Custom Topic'], [], [], 'Introduction\nUnrelated content')[0].text, '');
const rows = sections(['Results', 'Methodology'], ['results', 'methodology'], [], 'Methodology\nOne word\nResults\nOther words');
assert.equal(rows.map(row => row.name).join('|'), 'Results|Methodology');
assert.equal(rows[1].text, 'One word');
assert.equal(rows[0].text, 'Other words');
assert.equal(context.sectionRole('3.1 Research Methodology'), 'methodology');
assert.ok(!source.includes('Analysis Inspector'));
assert.equal(context.pairHasMissingSection({ role_a: 'results', role_b: 'discussion' }, ['results']), true);
assert.equal(context.pairHasMissingSection({ role_a: 'results', role_b: 'discussion' }, ['results', 'discussion']), false);
assert.equal(context.citationContains('Bolaños, F. (2024). Artificial intelligence.', 'Bolaños F'), true);
assert.equal(context.citationContains('Bolaños, F. (2024). Artificial intelligence.', 2024), true);
assert.equal(context.citationContains('Bolaños, F. (2024). Artificial intelligence.', 'Different title'), false);
console.log('Results checks passed: boundaries, status thresholds, topic order, no unrelated fallback.');
