import type { V7ScanResponse } from '../../services/v7Result';
import type React from 'react';
import { LockKeyhole } from 'lucide-react';
import { matchedRecommendations, recommendationRanges } from './highlights';
import { categoryColors, neutralHighlight } from './categoryColors';
import './manuscript.css';

function PaperHeading({ name }: { name: string }) {
  const chapter = name.match(/^(chapter\s+(?:[ivxlcdm]+|\d+))\b[\s:.-]*(.*)$/i);
  return <h2 className="manuscript-heading">{chapter ? <><span className="block">{chapter[1]}</span>{chapter[2] && <span className="block">{chapter[2]}</span>}</> : name}</h2>;
}

export function ManuscriptSections({ result, onHighlight, locked, unlockControl, revealed }: { result: V7ScanResponse; onHighlight?: (id: string) => void; locked?: boolean; unlockControl?: React.ReactNode; revealed?: boolean }) {
  const linked = matchedRecommendations(result.manuscript_sections ?? [], result.recommendations);
  const withheld = result.manuscript_sections?.slice(1) ?? [];
  const fallback = { heading: 'The manuscript continues', paragraphs: Array(3).fill('Quiet lines continue across the page. Soft words fill this space while the full report waits to be opened. '.repeat(4)) };
  return <div className="manuscript-body">
    {result.manuscript_sections?.slice(0, locked ? 1 : undefined).map((section, index) => {
      const text = section.text ?? '';
      const ranges = recommendationRanges(section, linked);
      return <section key={`${index}-${section.name}`} className={`scroll-mt-6 ${revealed && index > 0 ? 'report-reveal' : ''}`}>
        <PaperHeading name={section.name} />
        {section.text != null && (() => {
          const lines = [...text.matchAll(/[^\r\n]+/g)];
          const renderLine = (match: RegExpMatchArray) => {
            const start = match.index!;
            const end = start + match[0].length;
            const pieces: React.ReactNode[] = [];
            let cursor = start;
            for (const range of ranges.filter(item => item.start >= start && item.end <= end)) {
              const tone = range.category ? categoryColors[range.category] : neutralHighlight;
              pieces.push(text.slice(cursor, range.start));
              pieces.push(<button key={range.id} id={`highlight-${range.id}`} type="button" onClick={() => onHighlight?.(range.id)}
                aria-label={`Show recommendation for: ${text.slice(range.start, range.end)}`}
                className="manuscript-highlight" style={{ backgroundColor: tone.tint, color: tone.ink, textDecorationColor: tone.color }}>{text.slice(range.start, range.end)}</button>);
              cursor = range.end;
            }
            pieces.push(text.slice(cursor, end));
            return pieces;
          };
          const rendered: React.ReactNode[] = [];
          for (let line = 0; line < lines.length;) {
            let end = line;
            while (end < lines.length && lines[end][0].trim().length > 0 && lines[end][0].trim().length <= 60 &&
              !/[.!?;:]$/.test(lines[end][0].trim()) &&
              (end === line || lines[end].index! - (lines[end - 1].index! + lines[end - 1][0].length) <= 2)) end++;
            if (end - line >= 3) {
              rendered.push(<div key={line} className="manuscript-compact-block">{lines.slice(line, end).map((item, offset) => <p key={line + offset}>{renderLine(item)}</p>)}</div>);
              line = end;
            } else {
              rendered.push(<p key={line}>{renderLine(lines[line])}</p>);
              line++;
            }
          }
          return rendered;
        })()}
      </section>;
    })}
    {locked && <div className="locked-manuscript relative -mx-5 overflow-clip px-5 sm:mx-0 sm:px-0">
      <p className="sr-only">The rest of the manuscript is locked. Unlock the full report to read it.</p>
      <div className="locked-manuscript-copy" aria-hidden="true">
        {(withheld.length ? withheld : [{ name: '', text: null }]).map((section, index) => {
          const placeholder = section.placeholder ?? fallback;
          return <section key={index}>
            <PaperHeading name={placeholder.heading} />
            <div>{placeholder.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</div>
          </section>;
        })}
      </div>
      <div className="locked-manuscript-overlay">
        <div className="locked-manuscript-card w-full max-w-[360px] rounded-2xl border border-[#dfe5f5] bg-white p-5 text-center shadow-[0_16px_48px_#0b0f3d24] sm:p-6">
          <LockKeyhole className="mx-auto mb-3 size-6 text-[#0b0f3d]" aria-hidden="true" />
          <p className="mb-4 text-sm font-semibold text-[#0b0f3d]">{result.access?.locked_counts.sections} more sections, {result.access?.locked_counts.recommendations} {result.access?.locked_counts.recommendations === 1 ? 'recommendation' : 'recommendations'}, {result.access?.locked_counts.citations} {result.access?.locked_counts.citations === 1 ? 'citation' : 'citations'}</p>
          {unlockControl}
        </div>
      </div>
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
