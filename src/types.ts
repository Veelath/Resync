/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RolePairScore {
  role_a: string;
  role_b: string;
  weight: number;
  included: boolean;
  score?: number;
  raw_similarity?: number;
  reason?: string;
}

// A high-scoring (>= PAR) role pair, checked for whether its calibrated
// score reflects substantive alignment or just shared academic
// vocabulary/register.
export interface Verification {
  role_a: string;
  role_b: string;
  score: number;
  alignment: 'substantive' | 'superficial';
  note: string;
}

// A pair the XAI determined has no material inconsistency despite a low
// calibrated score -- the false-positive detector for the scoring model.
export interface DismissedPair {
  role_a: string;
  role_b: string;
  score: number;
  reason: string;
}

export interface CitedReference {
  // Backend master keys
  citation_raw_reference_text?: string;
  citation_is_accessible?: boolean;

  citation_status?:
    | 'verified_doi'
    | 'verified_url'
    | 'verified_metadata'
    | 'metadata_mismatch'
    | 'accessible'
    | 'restricted'
    | 'bot_wall'
    | 'broken'
    | 'unverified'
    | 'unknown_error'
    | 'no_link';
  citation_primary_link?: string;
  citation_authors_parsed?: string;
  citation_year_parsed?: number;
  citation_crossref_title?: string;
  citation_title_match_score?: number;
  citation_is_cited_in_text?: boolean;

  // Legacy/UI aliases
  citation?: string;
  status?: 'Accessible' | 'Unresolved' | 'Broken Link' | 'Missing Context' | 'Inaccessible';
  explanation?: string;
}

export interface ScoreBreakdown {
  overall_score: number;
  band: string;
  v6_dimensions?: Record<string, Record<string, number | null>> | null;
  structural_completeness_score?: number | null;
  cross_chapter_coherence_score?: number | null;
  citation_integrity_score?: number | null;
  biggest_lever?: {
    criterion: string;
    current_score: number;
    potential_point_gain: number;
    reason: string;
  } | null;
  structural_detail?: {
    present_required: string[];
    missing_required: string[];
    present_optional: string[];
    missing_optional: string[];
    stub_sections: string[];
  };
  coherence_detail?: {
    pair_scores: RolePairScore[];
    unevaluable_weight_fraction: number;
    dismissed_pairs?: DismissedPair[];
    verifications?: Verification[];
  };
  citation_detail?: {
    well_formed_ratio: number;
    link_resolution_rate: number;
    cross_match_score: number;
    total_entries: number;
  };
}

export interface AITextIndicator {
  overall_score?: number | null;
  section_scores?: Record<string, number | null>;
  flagged_sections?: string[];
  disclaimer?: string;
}

