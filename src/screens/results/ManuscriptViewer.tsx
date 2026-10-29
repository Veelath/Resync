import type { V7ScanResponse } from '../../services/v7Result';
import type React from 'react';
import { recommendationRanges } from './highlights';

export function PreviewLegend() {
  return <p className="flex items-start gap-2 text-sm text-[#4b5563]"><span className="mt-1 size-3 shrink-0 rounded-sm bg-[#fde2e4]" aria-hidden="true" />Highlighted: a sentence with a suggested revision.</p>;
}

export function ManuscriptSections({ result, onHighlight, locked, unlockControl }: { result: V7ScanResponse; onHighlight?: (id: string) => void; locked?: boolean; unlockControl?: React.ReactNode }) {
  return <div className="space-y-9">
    {result.manuscript_sections?.slice(0, locked ? 1 : undefined).map((section, index) => {
      const text = section.text ?? '';
      const ranges = recommendationRanges(section, result.recommendations);
      const pieces: React.ReactNode[] = [];
      let cursor = 0;
      for (const range of ranges) {
        pieces.push(text.slice(cursor, range.start));
        pieces.push(<button key={range.id} id={`highlight-${range.id}`} type="button" onClick={() => onHighlight?.(range.id)}
          aria-label={`Show recommendation for: ${text.slice(range.start, range.end)}`}
          className="rounded-sm bg-[#fde2e4] text-[#9f1239] underline decoration-[#be123c] underline-offset-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1fcc]">{text.slice(range.start, range.end)}</button>);
        cursor = range.end;
      }
      pieces.push(text.slice(cursor));
      return <section key={`${index}-${section.name}`} className="scroll-mt-6">
        <h2 className="mb-4 flex gap-3 text-lg font-semibold text-[#0b0f3d]"><span className="text-[#6b7280] tabular-nums">{index + 1}</span>{section.name}</h2>
        {section.text != null && <div className="whitespace-pre-wrap break-words font-serif text-[17px] leading-[1.7] text-[#303746]">{pieces}</div>}
      </section>;
    })}
    {locked && <div className="relative -mx-4 overflow-hidden rounded-2xl border border-[#dfe5f5] bg-gradient-to-b from-[#e9edf8] to-[#dfe5f5] px-5 pb-6 pt-7 sm:mx-0 sm:px-7">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#0b0f3d]" aria-hidden="true" />
      <p className="mb-5 text-sm font-semibold text-[#0b0f3d]">The rest of your manuscript is below the waterline</p>
      <ol start={2} className="space-y-2 text-sm text-[#4b5563]">{result.manuscript_sections?.slice(1).map((section, index) => <li key={`${index}-${section.name}`} className="flex gap-3"><span className="tabular-nums">{index + 2}</span>{section.name}</li>)}</ol>
      <p className="my-6 text-sm font-semibold text-[#0b0f3d]">{result.access?.locked_counts.sections} more sections, {result.access?.locked_counts.recommendations} recommendations, {result.access?.locked_counts.citations} citations</p>
      {unlockControl}
    </div>}
  </div>;
}

export function ManuscriptViewer({ result, reason }: { result: V7ScanResponse; reason?: string }) {
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
    <p className="text-sm text-gray-600">{/^https?:\/\/docs\.google\.com\//i.test(result.doc_url)
      ? reason === 'private' ? "The document is not shared with 'Anyone with the link can view', so only the passages the analysis refers to are shown."
        : "We couldn't load the document text right now, so only the passages the analysis refers to are shown."
      : "The full text of uploaded files isn't kept, so only the passages the analysis refers to are shown."}</p>
    {sections.length ? sections.map(section => <section key={section.name} className="border-t border-gray-100 pt-5 space-y-4">
      <h2 className="font-bold text-gray-900">{section.name}</h2>
      {section.passages.map((passage, index) => <div key={index} className="space-y-1">
        <p className="text-xs font-semibold text-gray-500">{passage.label}</p>
        <p className="font-serif text-sm sm:text-base leading-8 text-gray-800"><mark className="bg-rose-200 rounded px-0.5">{passage.text}</mark></p>
      </div>)}
    </section>) : <p className="text-sm text-gray-600">No passages were flagged in this manuscript.</p>}
  </div>;
}
