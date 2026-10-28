import { ScoreRing } from '../../components/AppScoreRing';
import type { V7ScanResponse } from '../../services/v7Result';
import { STRENGTH_THRESHOLD } from './helpers';

const baseHeading = (heading: string) => heading.replace(/\s*\(\d+\)$/, '').trim();

export function ResultsScorePanel({ result }: { result: V7ScanResponse }) {
  const score = result.overall_coherence_score;
  const scoredPairs = result.manuscript_flow.filter(pair => !pair.skipped_reason && pair.scores.overall_coherence != null);
  const scoredOrders = new Set(scoredPairs.map(pair => pair.order));
  const sections = new Set(result.sections_analyzed.map(baseHeading));
  const affected = new Set([...result.inconsistencies, ...result.recommendations]
    .flatMap(item => [item.section_a, item.section_b].map(baseHeading)));
  const percent = (count: number, total: number) => total ? Math.round(count / total * 100) : 0;

  // Overall status is the same weighted manuscript score shown in the ring.
  const overall = Math.round(score);
  // Key strengths are scored pairs at or above 70, divided by scored pairs.
  const strengths = percent(scoredPairs.filter(pair => pair.scores.overall_coherence! * 100 >= STRENGTH_THRESHOLD).length, scoredPairs.length);
  // Major issues are scored pairs with a finding, divided by scored pairs.
  const issues = percent(scoredPairs.filter(pair => result.inconsistencies.some(finding =>
    finding.pair_order === pair.order || (!scoredOrders.has(finding.pair_order) &&
      [finding.section_a, finding.section_b].some(section => [pair.section_a, pair.section_b].map(baseHeading).includes(baseHeading(section))))
  )).length, scoredPairs.length);
  // Affected sections are distinct merged headings in findings or recommendations, divided by manuscript sections.
  const affectedSections = percent([...sections].filter(section => affected.has(section)).length, sections.size);

  const cards = [
    { label: 'Overall status', value: overall, color: 'bg-amber-500', description: 'The weighted overall coherence score, rounded to a whole percent.' },
    { label: 'Key strengths', value: strengths, color: 'bg-emerald-500', description: `Scored neighboring pairs with a score of at least ${STRENGTH_THRESHOLD} out of 100, divided by all scored pairs.` },
    { label: 'Major issues', value: issues, color: 'bg-rose-500', description: 'Scored neighboring pairs with at least one finding, divided by all scored pairs.' },
    { label: 'Affected sections', value: affectedSections, color: 'bg-blue-500', description: 'Distinct manuscript sections named in a finding or recommendation, divided by all manuscript sections.' },
  ];

  return (
    <div className="relative px-5 pt-6 pb-4 border-b border-gray-100 flex flex-col items-center gap-2.5">
      <ScoreRing score={score} size={88} band={result.score_breakdown.band} solidArc />
      <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">Coherence Score</p>
      <p className="text-xs text-gray-500 text-center">Calculated from the consecutive-section analysis</p>
      <div className="w-full mt-2 space-y-2" aria-label="Result summary">
        <div className="grid grid-cols-2 gap-2">
          {cards.map(({ label, value, color, description }) => (
            <div key={label} className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-3" role="group" aria-label={`${label}: ${value}%. ${description}`} title={description}>
              <div className="flex items-start gap-2 text-xs text-gray-700">
                <span className={`mt-1 size-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 leading-tight">{label}</span>
                <span className="font-bold tabular-nums text-gray-900">{value}%</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
