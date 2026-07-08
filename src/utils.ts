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
  if (score >= 85) {
    return {
      label: 'High Coherence',
      strokeColor: 'stroke-indigo-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  } else if (score >= 70) {
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
Coherence Score: ${scan.coherenceScore}/100
Duplication Rate: ${scan.duplicationScore || 0}%
Research paradigm: ${scan.researchType ? scan.researchType.toUpperCase() : 'QUANTITATIVE'}
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
