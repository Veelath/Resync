import type { V7ScanResponse } from '../../services/v7Result';
import { ResultsScorePanel } from './ResultsScorePanel';
import { RecommendationsList, isRateLimited, type RecommendationItem } from './RecommendationsList';

export interface PrintCitation { id: string; ref: string; url: string; status: string; noLink?: boolean }

const STATUS_LABEL: Record<string, string> = { public: 'Accessible (Public)', private: 'Inaccessible (Private)' };
const noop = () => undefined;

/**
 * The page that is saved or printed by "Download PDF". It draws the same score panel and the same recommendation cards
 * as the results page, so the PDF looks like what the student sees. It is hidden on screen.
 */
export function ReportPrint({ result, title, items, citations, locked, lockedOrders }: {
  result: V7ScanResponse;
  title: string;
  items: RecommendationItem[];
  citations: PrintCitation[];
  locked: boolean;
  lockedOrders?: Set<number>;
}) {
  const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const counts = citations.reduce<Record<string, number>>((all, citation) => ({ ...all, [citation.status]: (all[citation.status] ?? 0) + 1 }), {});

  return <div className="report-print hidden print:block bg-white p-2 text-[#0b0f3d]" style={{ lineHeight: 1.5 }}>
    <style>{`
      @media print {
        /* Cards fade in on screen; a printed page must show them at once. */
        .report-print, .report-print * { animation: none !important; transition: none !important; opacity: 1 !important; transform: none !important; }
        .report-print h2.rpt-h { font-size: 16px; margin: 22px 0 10px; padding-bottom: 4px; border-bottom: 2px solid #1a1fcc; color: #1a1fcc; font-weight: 800; }
        .report-print section, .report-print .rp-card { break-inside: avoid; }
        .report-print .rpt-panel { max-width: 560px; margin: 0 auto; }
      }
    `}</style>

    <p style={{ color: '#1a1fcc', fontWeight: 800, fontSize: 18, margin: 0 }}>ReSync</p>
    <h1 style={{ fontSize: 22, margin: '4px 0 2px', fontWeight: 800 }}>Manuscript Coherence Report</h1>
    <p style={{ margin: '0 0 14px', color: '#4b5275' }}>{title} · {date}</p>

    <div className="rpt-panel">
      <ResultsScorePanel result={result} items={items} linkedIds={new Set()} onShowInManuscript={noop} revealId={null} />
    </div>

    <h2 className="rpt-h">Recommendations</h2>
    <div className="space-y-3">
      <RecommendationsList sections={result.manuscript_sections} items={items} pairs={result.manuscript_flow} linkedIds={new Set()} onShowInManuscript={noop} revealId={null}
        onlyOrders={lockedOrders} rateLimited={isRateLimited(result.ai_synthesis?.review_status)} showAll />
    </div>
    {locked && <p style={{ color: '#4b5275', fontStyle: 'italic', marginTop: 8 }}>This is the preview. Unlock the full report to include every recommendation.</p>}

    <h2 className="rpt-h">Citations</h2>
    {locked
      ? <p>{result.access?.locked_counts.citations ?? 0} citations were checked. Unlock the full report to list them.</p>
      : !citations.length
        ? <p>No citations were found.</p>
        : <>
            <p>{citations.length} checked: {(['public', 'private'] as const).map(status => `${counts[status] ?? 0} ${STATUS_LABEL[status]}`).join(', ')}.</p>
            <ol style={{ paddingLeft: 18, fontSize: 12 }}>{citations.map(citation => <li key={citation.id} style={{ marginBottom: 3, breakInside: 'avoid' }}>
              {citation.ref} <em style={{ color: '#4b5275' }}>({citation.noLink ? 'No link to check' : STATUS_LABEL[citation.status] ?? citation.status})</em>
            </li>)}</ol>
          </>}
  </div>;
}
