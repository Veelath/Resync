import type { CitationReport, AITextIndicatorResponse } from './api';

export type DimensionKey = 'objectives_alignment' | 'methodology_fit' | 'numeric_consistency' | 'claim_support';
export type PairScores = Record<DimensionKey | 'overall_coherence', number | null>;

export interface ManuscriptFlowPair {
  order: number;
  section_a: string;
  section_b: string;
  pair_weight: number | null;
  pair_score?: number | null;
  numeric_applicable?: boolean;
  scores: PairScores;
  skipped_reason: string | null;
  culprit_sentences: { section_a: { sentence: string; delta: number }[]; section_b: { sentence: string; delta: number }[] };
  explanation: {
    coherence_scores: { overall: number; objectives: number; methodology: number; numeric: number; claims: number };
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
  manuscript_sections?: { name: string; text: string | null; placeholder?: { heading: string; paragraphs: string[] } }[];
  overall_coherence_score: number;
  sections_analyzed: string[];
  manuscript_flow: ManuscriptFlowPair[];
  inconsistencies_found: number;
  inconsistencies: V7Inconsistency[];
  recommendations: V7Recommendation[];
  ai_synthesis: { summary: string | null; strongest_pair: PairPointer | null; weakest_pair: PairPointer | null };
  citations_audited: number;
  citations: CitationReport[];
  score_breakdown: {
    overall_score: number;
    band: 'Strong' | 'Solid' | 'Needs Revision';
    cross_chapter_coherence_score: number;
    citation_integrity_score: number | null;
    dimensions: Record<DimensionKey, number | null>;
    dimension_weights?: Partial<Record<DimensionKey, number>> | null;
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
