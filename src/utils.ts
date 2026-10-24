/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


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
export function getScoreTier(band?: string): ScoreTier {
  if (band === 'Strong') {
    return {
      label: 'Strong Coherence',
      strokeColor: 'stroke-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  } else if (band === 'Needs Revision') {
    return {
      label: 'Needs Revision',
      strokeColor: 'stroke-rose-500',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
    };
  } else {
    return {
      label: 'Solid',
      strokeColor: 'stroke-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-800',
      borderColor: 'border-amber-200',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
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
