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
 * Thresholds mirror services/scoring.py::_band_for exactly (85/70/55) --
 * previously this used 80/50 while App.tsx's inline ternary used 85, so an
 * 82 could render "High Coherence" in one place and "Moderate Coherence"
 * in another on the same report. When the backend-computed band string is
 * available (scan.score_breakdown.band), pass it as `band` so the label
 * itself comes from the single source of truth rather than being
 * re-derived client-side; older cached scans without score_breakdown fall
 * back to the score-only labels below.
 */
export function getScoreTier(score: number, band?: string): ScoreTier {
  if (score >= 85) {
    return {
      label: band ?? 'Strong',
      strokeColor: 'stroke-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  } else if (score >= 70) {
    return {
      label: band ?? 'Solid',
      strokeColor: 'stroke-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-800',
      borderColor: 'border-amber-200',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
    };
  } else if (score >= 55) {
    return {
      label: band ?? 'Needs Revision',
      strokeColor: 'stroke-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-800',
      borderColor: 'border-orange-200',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200'
    };
  } else {
    return {
      label: band ?? 'Major Revision',
      strokeColor: 'stroke-rose-500',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
    };
  }
}

// Mirrors services/scoring.py::compute_citation_integrity's link_resolution_rate
// definition of a defect -- no_link (print-only reference) and bot_wall
// (publisher blocked automated verification, benefit of the doubt) are not
// counted there, so the UI's "citations flagged" count must not sweep them
// in either. Previously `status !== 'Accessible'` counted both as flagged,
// producing 34 flagged against a citation-integrity score of 83 on the
// same report.
export function isCitationDefect(c: { citation_status?: string; status?: string }): boolean {
  if (c.citation_status) {
    return c.citation_status === 'broken'
      || c.citation_status === 'metadata_mismatch'
      || c.citation_status === 'unknown_error';
  }
  // Legacy fallback for rows with no citation_status ladder value.
  return c.status === 'Broken Link';
}

/**
 * Standardizes the file creation and download structure for a manuscript coherence audit report.
 */
export function downloadReport(scan: ScanResult) {
  const sectionsText = scan.missingSections && scan.missingSections.length > 0 
    ? scan.missingSections.join(', ') 
    : 'None';
  
  const text = `==================================================
RESYNC MANUSCRIPT COHERENCE AUDIT REPORT
==================================================
Title: ${scan.title}
Date Scanned: ${new Date(scan.timestamp).toLocaleString()}
Coherence Score: ${scan.coherenceScore}/100${scan.score_breakdown ? ` (${scan.score_breakdown.band})` : ''}
${scan.score_breakdown ? `Structural Completeness: ${scan.score_breakdown.structural_completeness_score ?? 'N/A'}
Cross-Chapter Coherence: ${scan.score_breakdown.cross_chapter_coherence_score ?? 'N/A'}
Citation Integrity: ${scan.score_breakdown.citation_integrity_score ?? 'N/A'}
` : ''}Research paradigm: ${scan.researchType ? scan.researchType.toUpperCase() : 'QUANTITATIVE'}
Document Source: ${scan.documentLink}
==================================================

OVERALL ASSESSMENT:
${scan.overallAssessment}

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

==================================================
SUGGESTED REVISIONS & RECOMMENDATIONS:
${scan.suggestions.length === 0 ? 'No suggestions available.' : 
  scan.suggestions.map((s, i) => `
[Revision #${i + 1}]
Category: ${s.category}
Issue: ${s.issue}
Remedy: ${s.remedy}
Explainable Rationale: ${s.explanation}
--------------------------------------------------`).join('\n')}

==================================================
BIBLIOGRAPHICAL CITATION AUDIT:
${scan.references.length === 0 ? 'No references audited.' : 
  scan.references.map((r, i) => `
[Citation #${i + 1}]
Reference: ${r.citation}
Status: ${r.status}
Details: ${r.explanation}
--------------------------------------------------`).join('\n')}
`;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Resync_Audit_Report_${scan.title.replace(/\s+/g, '_')}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
