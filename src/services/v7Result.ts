import type { CitationReport, AITextIndicatorResponse } from './api';

export type DimensionKey = 'objectives_alignment' | 'methodology_fit' | 'numeric_consistency' | 'claim_support';
export type DimensionName = 'context_alignment' | 'operational_alignment' | 'evidence_consistency' | 'logical_support';
export interface DimensionDeduction { order: number | null; section_a: string; section_b: string; severity: 'Critical' | 'Moderate' | 'Minor'; points: number }
/** One failed check: a pair of sections that did not pass a category, because the AI review quoted a contradiction or because neighbors were only loosely linked (`rating` is the model's 0 to 1 rating). */
export interface DimensionFailure { order: number | null; section_a: string; section_b: string; reason: 'contradiction' | 'loose_link'; severity: 'Critical' | 'Moderate' | 'Minor' | null; rating: number; /** Points this check earned out of 1, and which kind of check it was. Missing in older reports. */ credit?: number; kind?: 'flow' | 'cross' }
/** `score` is the percentage of the category's checks that passed. Reports saved before checks were counted carry `baseline`/`penalty` instead of `items`/`passed`/`failures`. */
/** Checks of one kind: how many there were and how many passed. */
export interface CheckCount { items: number; passed: number; /** Points earned by these checks: 1 for a pass, partial credit for a failed one. Missing in older reports. */ credit?: number }
/** Every check is worth one point. */
export interface CheckPoints { perfect: number; partial: number; zero: number; earned: number; total: number }
export type DimensionBreakdown = Record<DimensionName, { score: number | 'N/A'; items?: number; passed?: number; /** True when flow and chapter checks are weighed as two halves; with too few checks they are pooled. */ halves?: boolean; flow?: CheckCount; cross?: CheckCount; points?: CheckPoints; /** 'balanced' = flow and chapters each count half; otherwise only one kind of check existed. */ basis?: 'balanced' | 'flow_only' | 'chapters_only' | null; /** A kind of check had fewer than 3 checks, so one check moves this score a lot. */ limited?: boolean; /** Checks that rest on the model's rating alone because the AI review did not finish. */ estimated?: number; failures?: DimensionFailure[]; baseline?: number | null; penalty: number; issues?: number; pairs?: number; deductions?: DimensionDeduction[] }>;
export type PairScores = Record<DimensionKey | 'overall_coherence', number | null>;

export interface ManuscriptFlowPair {
  order: number;
  section_a: string;
  section_b: string;
  pair_weight: number | null;
  pair_score?: number | null;
  numeric_applicable?: boolean;
  severity?: 'Critical' | 'Moderate' | 'Minor' | 'None' | null;
  index_a?: number;
  index_b?: number;
  /** false for a pair of sections that are not neighbors (a cross-chapter check) */
  adjacent?: boolean;
  failed_dimension?: DimensionKey | 'none' | null;
  scores: PairScores;
  skipped_reason: string | null;
  culprit_sentences: { section_a: { sentence: string; delta: number }[]; section_b: { sentence: string; delta: number }[] };
  explanation: {
    coherence_scores: { overall: number; objectives: number; methodology: number; numeric: number; claims: number };
    link_summary?: string;
    comparison?: { a_says?: string; b_says?: string };
    highlighted_inconsistencies: { section: string; quote: string; what: string; why: string }[];
    recommendations: { section: string; original_sentence: string | null; recommended_revision: string }[];
    reference_list: { section: string; sentence: string }[];
  } | null;
}

export interface V7Inconsistency {
  section_a: string;
  section_b: string;
  pair_order: number;
  coherence_score: number;
  explanation_what: string;
  explanation_why: string;
  suggested_fix: string;
  inconsistency_id: string;
  evidence_a: string;
  evidence_b: string;
  evidence_quotes: { section: string; text: string }[];
  evidence_verified: boolean;
  finding_status: 'material_issue';
}

export interface V7Recommendation {
  id?: string;
  section?: string;
  recommendation_id: string;
  section_a: string;
  section_b: string;
  pair_order: number;
  original_sentence: string | null;
  issue?: string;
  kind?: 'edit' | 'add';
  placement?: 'start' | 'end';
  recommended_revision: string;
  recommendation_text: string;
  recommendation_priority: 'High' | 'Medium' | 'Low';
}

export interface PairPointer {
  order: number;
  section_a: string;
  section_b: string;
  overall_coherence: number;
  score: number;
}

export interface V7ScanResponse {
  status: string;
  analysis_run_id: string;
  user_id: string;
  manuscript_id: string;
  doc_url: string;
  manuscript_title?: string | null;
  result_version: 'v7';
  access?: { unlocked: boolean; unlock_cost: number; locked_counts: { sections: number; recommendations: number; citations: number } };
  manuscript_sections?: { name: string; text: string | null; display_name?: string | null; blocks?: ({ type: 'paragraph'; text: string } | { type: 'table'; rows: string[][] })[] | null; placeholder?: { heading: string; paragraphs: string[] } }[];
  overall_coherence_score: number;
  /** Set when the paper had no usual headings, saying how it was split into sections. */
  structure_note?: string | null;
  rescan_unchanged?: boolean;
  dimension_breakdown?: DimensionBreakdown;
  sections_analyzed: string[];
  manuscript_flow: ManuscriptFlowPair[];
  inconsistencies_found: number;
  inconsistencies: V7Inconsistency[];
  recommendations: V7Recommendation[];
  ai_synthesis: { summary: string | null; strongest_pair: PairPointer | null; weakest_pair: PairPointer | null; review_status?: { status: 'complete' | 'partial' | 'daily_limit'; unreviewed: number; /** complete: every weak pair was AI-reviewed. degraded: some were not. incomplete: under half were, so the score is an ML-only estimate. Missing in older reports. */ analysis?: 'complete' | 'degraded' | 'incomplete'; basis?: 'ai_verified' | 'mixed' | 'ml_estimate'; reviewed?: number; needs_review?: number; whole_paper_check?: 'ran' | 'skipped'; unverified?: number } };
  citations_audited: number;
  citations: CitationReport[];
  score_breakdown: {
    overall_score: number;
    band: 'Strong' | 'Solid' | 'Needs Revision';
    cross_chapter_coherence_score: number;
    citation_integrity_score: number | null;
    dimensions: Record<DimensionKey, number | null>;
    dimension_weights?: Partial<Record<DimensionKey, number>> | null;
    dimension_breakdown?: DimensionBreakdown;
    citation_detail: { well_formed_ratio: number; link_resolution_rate: number; cross_match_score: number; total_entries: number };
  };
  ai_text_indicator: AITextIndicatorResponse | null;
  db_save_status: string;
  notification_dispatched: boolean;
  credits_remaining: number | null;
}

export type LegacyScanResponse = { result_version?: string | null; analysis_run_id?: string; sections_analyzed?: string[]; citations_audited?: number };
export type ScanResult = V7ScanResponse | LegacyScanResponse;

// One API-to-UI boundary: only the explicit version marker makes a result renderable.
export function adaptScanResult(raw: unknown): ScanResult {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid scan result.');
  const result = raw as LegacyScanResponse;
  return result.result_version === 'v7' ? result as V7ScanResponse : result;
}
