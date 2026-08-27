/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id?: string;   // Supabase auth.users UUID
  email: string;
  name: string;
  institution?: string;
  role?: string;
  bio?: string;
}

export interface Inconsistency {
  // Backend master keys
  section_a?: string;
  section_b?: string;
  // Optional: a deterministic numeric-audit finding has no coherence
  // score at all (null), distinct from a real score of zero.
  coherence_score?: number | null;
  explanation_what?: string;
  explanation_why?: string;
  suggested_fix?: string;
  inconsistency_id?: string;
  evidence_a?: string;
  evidence_b?: string;
  // True only if every non-empty evidence quote above was found verbatim
  // in its source section -- false means the model's cited quote could
  // not be verified and evidence_a/evidence_b were left empty rather
  // than showing a fabricated one.
  evidence_verified?: boolean;
  objectives_unaddressed?: string[];
  finding_status?: 'material_issue';

  // Legacy/UI aliases
  sectionA?: string;
  sectionB?: string;
  inconsistencyType?: 'contradiction' | 'redundancy' | 'logic_gap' | 'terminology_clash';
  description?: string;
  severity?: 'High' | 'Medium' | 'Low';
  howToFix?: string;
}

// A calibrated cross-chapter role-pair score (services/scoring.py
// ROLE_PAIR_WEIGHTS), replacing the deprecated adjacent-pair/linear
// section_scores as the source of truth for what counts as "coherent".
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

export interface Suggestion {
  category: 'Structure' | 'Methodology' | 'Citation' | 'Style';
  issue: string;
  explanation: string;
  remedy: string;
}

export interface CitedReference {
  // Backend master keys
  citation_raw_reference_text?: string;
  citation_is_accessible?: boolean;

  // Verification detail (replaces the old accessible/broken-only boolean)
  citation_status?: 'verified_metadata' | 'metadata_mismatch' | 'accessible' | 'bot_wall' | 'broken' | 'unknown_error' | 'no_link';
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

export interface ScanResult {
  id: string;
  userId: string;
  user_id?: string;
  manuscript_id?: string;
  title: string;
  documentLink: string;
  doc_url?: string;
  chapterType: string;
  
  // Backend master coherence score & legacy alias
  overall_coherence_score?: number;
  coherenceScore: number;
  
  overallAssessment: string;
  
  // Backend master lists & legacy aliases
  inconsistencies?: Inconsistency[];
  correlationReport: Inconsistency[];
  
  citations?: CitedReference[];
  references: CitedReference[];
  
  // Deprecated: the linear adjacent-pair scale. Kept for the legacy
  // Reports tab / mobile app but no longer drives Strong Coherence --
  // see score_breakdown.coherence_detail.pair_scores for the calibrated
  // role-pair scores that actually decide "strong" vs "weak".
  section_scores?: Array<{section_a: string, section_b: string, score: number, note?: string}>;
  verifications?: Verification[];
  suggestions: Suggestion[];
  timestamp: string;
  supportingDoc?: string;
  styleGuideLink?: string;

  missing_sections?: string[];
  missingSections?: string[];

  sections_analyzed?: string[];
  has_all_required_sections?: boolean;
  auto_detected?: boolean;
  detection_confidence?: number;

  score_breakdown?: ScoreBreakdown;
  ai_text_indicator?: AITextIndicator;

  researchType?: 'quantitative' | 'qualitative';
  analysis_run_id?: string;
  status?: string;
  db_save_status?: string;
  notification_dispatched?: boolean;
}


