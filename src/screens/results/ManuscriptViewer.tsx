import type { V7ScanResponse } from '../../services/v7Result';

export function ManuscriptViewer({ result }: { result: V7ScanResponse }) {
  const passages = [
    ...result.inconsistencies.filter(finding => finding.evidence_verified).flatMap(finding =>
      finding.evidence_quotes.map(quote => ({
        section: quote.section, text: quote.text,
        label: `Finding · ${finding.section_a} → ${finding.section_b}`,
      }))),
    ...result.manuscript_flow.flatMap(pair => [
      ...pair.culprit_sentences.section_a.map(culprit => ({ section: pair.section_a, text: culprit.sentence, label: `Pair · ${pair.section_a} → ${pair.section_b}` })),
      ...pair.culprit_sentences.section_b.map(culprit => ({ section: pair.section_b, text: culprit.sentence, label: `Pair · ${pair.section_a} → ${pair.section_b}` })),
    ]),
  ].filter(passage => passage.text.trim());
  const sections = result.sections_analyzed.map(name => ({ name, passages: passages.filter(passage => passage.section === name) }))
    .filter(section => section.passages.length);

  return <div className="space-y-6">
    <p className="text-sm text-gray-600">The full text of uploaded files isn't kept, so only the passages the analysis refers to are shown.</p>
    {sections.length ? sections.map(section => <section key={section.name} className="border-t border-gray-100 pt-5 space-y-4">
      <h2 className="font-bold text-gray-900">{section.name}</h2>
      {section.passages.map((passage, index) => <div key={index} className="space-y-1">
        <p className="text-xs font-semibold text-gray-500">{passage.label}</p>
        <p className="font-serif text-sm sm:text-base leading-8 text-gray-800"><mark className="bg-rose-200 rounded px-0.5">{passage.text}</mark></p>
      </div>)}
    </section>) : <p className="text-sm text-gray-600">No passages were flagged in this manuscript.</p>}
  </div>;
}
