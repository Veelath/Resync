/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScanResult } from './types.js';

export interface ScoreTier {
  label: string;
  strokeColor: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  badgeClass: string;
}

/**
 * Categorizes coherence scores into standardized tiers and styling classes.
 */
export function getScoreTier(score: number): ScoreTier {
  if (score >= 80) {
    return {
      label: 'High Coherence',
      strokeColor: 'stroke-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  } else if (score >= 50) {
    return {
      label: 'Moderate Coherence',
      strokeColor: 'stroke-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-800',
      borderColor: 'border-amber-200',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
    };
  } else {
    return {
      label: 'Low Coherence',
      strokeColor: 'stroke-rose-500',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
    };
  }
}

// Mirrors services/scoring.py PAR_SCORE (scoring.py:131) -- the calibrated
// role-pair score threshold above which a coherence link counts as
// "strong" rather than needing attention.
export const PAR_SCORE = 80;

/**
 * Turns a backend role/section key into readable label text, e.g.
 * "cross_chapter_coherence" -> "Cross Chapter Coherence",
 * "__document__" -> "Document".
 */
export function formatRoleLabel(role: string): string {
  return role
    .replace(/^__+|__+$/g, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface RevisionPlanItem {
  id: string;
  label: string;
  detail: string;
  pointGain: number;
}

export interface RevisionPlan {
  items: RevisionPlanItem[];
  currentScore: number;
  projectedScore: number;
}

// Mirrors services/scoring.py DEFAULT_WEIGHTS (scoring.py:348-352) and the
// active-criterion renormalization at scoring.py:441-451 (a null sub-score
// is excluded from the weighted mean, not zeroed).
export const REVISION_WEIGHTS = { structural: 0.25, coherence: 0.50, citation: 0.25 } as const;
type RevisionCriterion = keyof typeof REVISION_WEIGHTS;

// Mirrors services/scoring.py structural weights (scoring.py:22-29). A
// missing/stub required section is worth more than an optional one.
const REQUIRED_SECTION_WEIGHT = 1.0;
const OPTIONAL_SECTION_WEIGHT = 0.4;

// Coherence fixes target PAR_SCORE (a believable "bring this pair up to
// solid") rather than a perfect 100, which the backend's own
// biggest_lever diagnostic uses and would overstate an achievable gain.
const COHERENCE_FIX_TARGET = PAR_SCORE;

/**
 * Computes an ordered worklist of concrete fixes with a projected score
 * gain per fix, from data already present in a completed scan's
 * score_breakdown. Every weight mirrors a backend constant (see comments
 * above) so the projected total stays consistent with services/scoring.py.
 */
export function computeRevisionPlan(scan: ScanResult): RevisionPlan {
  const breakdown = scan.score_breakdown;
  const currentScore = Math.round(breakdown?.overall_score ?? scan.coherenceScore ?? 0);

  if (!breakdown) {
    return { items: [], currentScore, projectedScore: currentScore };
  }

  const active: Record<RevisionCriterion, boolean> = {
    structural: breakdown.structural_completeness_score != null,
    coherence: breakdown.cross_chapter_coherence_score != null,
    citation: breakdown.citation_integrity_score != null,
  };
  const activeWeightSum =
    (Object.keys(active) as RevisionCriterion[])
      .filter((k) => active[k])
      .reduce((sum, k) => sum + REVISION_WEIGHTS[k], 0) || 1;
  const normWeight = (k: RevisionCriterion) => (active[k] ? REVISION_WEIGHTS[k] / activeWeightSum : 0);

  const items: RevisionPlanItem[] = [];

  // --- Coherence: role pairs scoring below the par target -----------------
  const pairScores = breakdown.coherence_detail?.pair_scores || [];
  const includedPairs = pairScores.filter((p) => p.included);
  const totalPairWeight = includedPairs.reduce((sum, p) => sum + p.weight, 0);
  if (totalPairWeight > 0) {
    includedPairs.forEach((p) => {
      const score = p.score ?? 0;
      if (score >= COHERENCE_FIX_TARGET) return;
      const deltaSub = (p.weight * (COHERENCE_FIX_TARGET - score)) / totalPairWeight;
      const gain = normWeight('coherence') * deltaSub;
      if (gain <= 0.05) return;
      items.push({
        id: `pair-${p.role_a}-${p.role_b}`,
        label: `Align ${formatRoleLabel(p.role_a)} with ${formatRoleLabel(p.role_b)}`,
        detail: `Currently scoring ${Math.round(score)}/100 for coherence between these sections.`,
        pointGain: gain,
      });
    });
  }

  // --- Structural: missing required sections + thin/stub sections ---------
  const structural = breakdown.structural_detail;
  if (structural) {
    const totalStructWeight =
      REQUIRED_SECTION_WEIGHT * (structural.present_required.length + structural.missing_required.length) +
      OPTIONAL_SECTION_WEIGHT * (structural.present_optional.length + structural.missing_optional.length);
    if (totalStructWeight > 0) {
      const perRequiredGain = normWeight('structural') * ((REQUIRED_SECTION_WEIGHT / totalStructWeight) * 100);
      structural.missing_required.forEach((sec) => {
        items.push({
          id: `missing-${sec}`,
          label: `Write the missing ${formatRoleLabel(sec)} section`,
          detail: 'Add at least 40 words -- this section is currently absent.',
          pointGain: perRequiredGain,
        });
      });
      structural.stub_sections.forEach((sec) => {
        items.push({
          id: `stub-${sec}`,
          label: `Expand the ${formatRoleLabel(sec)} section`,
          detail: 'This section exists but is too short to count as complete (under 40 words).',
          pointGain: perRequiredGain,
        });
      });
    }
  }

  // --- Citations: broken reference links, aggregated into one fix ---------
  const citationDetail = breakdown.citation_detail;
  const allCitations = (scan.citations && scan.citations.length > 0) ? scan.citations : (scan.references || []);
  const brokenCount = allCitations.filter((c) => c.citation_is_accessible === false).length;
  if (citationDetail && citationDetail.total_entries > 0 && brokenCount > 0) {
    // Link resolution is 0.40 of the citation sub-score (scoring.py:329-333).
    const perLinkGain = normWeight('citation') * ((0.40 * 100) / citationDetail.total_entries);
    items.push({
      id: 'broken-citations',
      label: `Fix ${brokenCount} broken reference link${brokenCount > 1 ? 's' : ''}`,
      detail: `${brokenCount} of ${citationDetail.total_entries} references could not be verified as reachable.`,
      pointGain: perLinkGain * brokenCount,
    });
  }

  items.sort((a, b) => b.pointGain - a.pointGain);
  const roundedItems = items.map((it) => ({ ...it, pointGain: Math.round(it.pointGain * 10) / 10 }));
  const totalGain = roundedItems.reduce((sum, it) => sum + it.pointGain, 0);
  const projectedScore = Math.min(100, Math.round((currentScore + totalGain) * 10) / 10);

  return { items: roundedItems, currentScore, projectedScore };
}

/**
 * Standardizes the file creation and download structure for a manuscript coherence audit report.
 */
export function downloadReport(scan: ScanResult) {
  const sectionsText = scan.missingSections && scan.missingSections.length > 0
    ? scan.missingSections.join(', ')
    : 'None';

  const breakdown = scan.score_breakdown;
  const ai = scan.ai_text_indicator;
  const plan = computeRevisionPlan(scan);

  const revisionPlanText = plan.items.length === 0
    ? 'No specific fixes identified.'
    : plan.items.map((it, i) => `${i + 1}. ${it.label} (+${it.pointGain} pts)\n   ${it.detail}`).join('\n');

  const pairScoresText = (breakdown?.coherence_detail?.pair_scores || [])
    .filter((p) => p.included)
    .map((p) => `- ${formatRoleLabel(p.role_a)} <-> ${formatRoleLabel(p.role_b)}: ${p.score ?? 'N/A'}/100 (weight ${p.weight})`)
    .join('\n') || 'No pair scores available.';

  const dismissedText = (breakdown?.coherence_detail?.dismissed_pairs || [])
    .map((d) => `- ${formatRoleLabel(d.role_a)} <-> ${formatRoleLabel(d.role_b)}: cleared at ${d.score}/100 -- ${d.reason}`)
    .join('\n') || 'None.';

  const stubText = breakdown?.structural_detail?.stub_sections?.length
    ? breakdown.structural_detail.stub_sections.join(', ')
    : 'None';

  const citationDetailText = breakdown?.citation_detail
    ? `Well-formed: ${Math.round(breakdown.citation_detail.well_formed_ratio * 100)}% | Link resolution: ${Math.round(breakdown.citation_detail.link_resolution_rate * 100)}% | Cross-match: ${Math.round(breakdown.citation_detail.cross_match_score * 100)}% | Total entries: ${breakdown.citation_detail.total_entries}`
    : 'Not evaluated.';

  const originalityText = ai?.overall_score != null
    ? `Writing style score: ${Math.round(ai.overall_score)}/100${ai.flagged_sections?.length ? `\nSections with unusually uniform phrasing: ${ai.flagged_sections.map(formatRoleLabel).join(', ')}` : ''}\n\n${ai.disclaimer || 'Advisory only -- not an academic-integrity determination.'}`
    : 'Not evaluated for this scan.';

  const text = `==================================================
RESYNC MANUSCRIPT COHERENCE AUDIT REPORT
==================================================
Title: ${scan.title}
Date Scanned: ${new Date(scan.timestamp).toLocaleString()}
Coherence Score: ${scan.coherenceScore}/100${breakdown ? ` (${breakdown.band})` : ''}
${breakdown ? `Structural Completeness: ${breakdown.structural_completeness_score ?? 'N/A'}
Cross-Chapter Coherence: ${breakdown.cross_chapter_coherence_score ?? 'N/A'}
Citation Integrity: ${breakdown.citation_integrity_score ?? 'N/A'}
` : ''}Document Source: ${scan.documentLink}
Sections Analyzed: ${scan.sections_analyzed && scan.sections_analyzed.length > 0 ? scan.sections_analyzed.join(', ') : 'N/A'}
==================================================

OVERALL ASSESSMENT:
${scan.overallAssessment}

==================================================
REVISION PLAN (projected ${plan.currentScore} -> ${plan.projectedScore}):
${revisionPlanText}

==================================================
LOGICAL CONSISTENCY FLAGS DETECTED:
${scan.correlationReport.length === 0 ? 'No consistency conflicts detected.' :
  scan.correlationReport.map((c, i) => `
[Flag #${i + 1}]
Type: ${c.inconsistencyType.replace('_', ' ').toUpperCase()}
Severity: ${c.severity}
Sections: ${c.sectionA} <-> ${c.sectionB}
Conflict: ${c.description}
Actionable Fix: ${c.howToFix}
--------------------------------------------------`).join('\n')}

==================================================
MISSING MANUSCRIPT SECTIONS:
${sectionsText}

THIN SECTIONS (under 40 words):
${stubText}

==================================================
COHERENCE PAIR SCORES:
${pairScoresText}

PAIRS CHECKED AND CLEARED (flagged low, then confirmed fine by the model):
${dismissedText}

==================================================
BIBLIOGRAPHICAL CITATION AUDIT:
${citationDetailText}
${scan.references.length === 0 ? 'No references audited.' :
  scan.references.map((r, i) => `
[Citation #${i + 1}]
Reference: ${r.citation}
Status: ${r.status}
Details: ${r.explanation}
--------------------------------------------------`).join('\n')}

==================================================
WRITING STYLE ADVISORY (not part of the coherence score):
${originalityText}
`;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Resync_Audit_Report_${scan.title.replace(/\s+/g, '_')}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
