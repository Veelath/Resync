import type { V7ScanResponse } from '../services/v7Result';

export interface Citation {
  id: string;
  ref: string;
  url: string;
  status: 'public' | 'private';
  title?: string;
  authors?: string;
  year?: number | string;
}

export const SAMPLE_MANUSCRIPT = 'Abstract\nThis sample manuscript explores guided reading outcomes.\n\nIntroduction\nGuided reading may improve comprehension.';

export const SAMPLE_REPORT: V7ScanResponse = {
  status: 'completed', analysis_run_id: 'sample', user_id: 'sample', manuscript_id: 'sample', doc_url: 'sample.docx', result_version: 'v7',
  overall_coherence_score: 74, sections_analyzed: ['Abstract', 'Introduction'], manuscript_flow: [],
  inconsistencies_found: 0, inconsistencies: [], recommendations: [],
  ai_synthesis: { summary: 'This sample introduces a guided reading study.', strongest_pair: null, weakest_pair: null },
  citations_audited: 0, citations: [],
  score_breakdown: {
    overall_score: 74, band: 'Solid', cross_chapter_coherence_score: 74, citation_integrity_score: null,
    dimensions: { objectives_alignment: null, methodology_fit: null, numeric_consistency: null, claim_support: null },
    citation_detail: { well_formed_ratio: 0, link_resolution_rate: 0, cross_match_score: 0, total_entries: 0 },
  },
  ai_text_indicator: null, db_save_status: 'sample', notification_dispatched: false, credits_remaining: null,
};
