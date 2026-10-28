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

export const SAMPLE_MANUSCRIPT = `Abstract
This manuscript examines whether guided reading improves comprehension among university students.

Introduction
Guided reading is expected to support reading comprehension. The study compares student performance before and after the intervention.

Methodology
The study measures reading comprehension before and after six weeks of guided reading. Students completed a pre-test and a post-test using the same assessment instrument.

Results
The post-test results are reported for thirty students. The mean post-test score exceeded the mean pre-test score, but the Results section does not report both values together.

Conclusion
The findings suggest guided reading may improve comprehension. The manuscript should connect this conclusion to the paired measurements described in Methodology.`;

export const SAMPLE_REPORT: V7ScanResponse = {
  status: 'completed',
  analysis_run_id: '11111111-1111-4111-8111-111111111111',
  user_id: '22222222-2222-4222-8222-222222222222',
  manuscript_id: '33333333-3333-4333-8333-333333333333',
  doc_url: 'guided-reading-outcomes.docx',
  result_version: 'v7',
  overall_coherence_score: 75.5,
  sections_analyzed: ['Abstract', 'Introduction', 'Methodology', 'Results', 'Conclusion'],
  manuscript_flow: [
    {
      order: 1, section_a: 'Abstract', section_b: 'Introduction', pair_weight: 1, pair_score: 0.78, numeric_applicable: true,
      scores: { objectives_alignment: 0.78, methodology_fit: 0.72, numeric_consistency: 0.88, claim_support: 0.74, overall_coherence: 0.78 },
      skipped_reason: null, culprit_sentences: { section_a: [], section_b: [] },
      explanation: {
        coherence_scores: { overall: 0.78, objectives: 0.78, methodology: 0.72, numeric: 0.88, claims: 0.74 },
        highlighted_inconsistencies: [], recommendations: [], reference_list: [],
      },
    },
    {
      order: 2, section_a: 'Introduction', section_b: 'Methodology', pair_weight: 1, pair_score: 0.82, numeric_applicable: true,
      scores: { objectives_alignment: 0.81, methodology_fit: 0.86, numeric_consistency: 0.79, claim_support: 0.82, overall_coherence: 0.82 },
      skipped_reason: null, culprit_sentences: { section_a: [], section_b: [] },
      explanation: {
        coherence_scores: { overall: 0.82, objectives: 0.81, methodology: 0.86, numeric: 0.79, claims: 0.82 },
        highlighted_inconsistencies: [], recommendations: [], reference_list: [],
      },
    },
    {
      order: 3, section_a: 'Methodology', section_b: 'Results', pair_weight: 1, pair_score: 0.7025, numeric_applicable: true,
      scores: { objectives_alignment: 0.83, methodology_fit: 0.79, numeric_consistency: 0.58, claim_support: 0.61, overall_coherence: 0.7025 },
      skipped_reason: null,
      culprit_sentences: {
        section_a: [{ sentence: 'The study measures reading comprehension before and after six weeks of guided reading.', delta: 0.031 }],
        section_b: [{ sentence: 'The post-test results are reported for thirty students.', delta: 0.022 }],
      },
      explanation: {
        coherence_scores: { overall: 0.7025, objectives: 0.83, methodology: 0.79, numeric: 0.58, claims: 0.61 },
        highlighted_inconsistencies: [
          { section: 'Methodology', quote: 'The study measures reading comprehension before and after six weeks of guided reading.', what: 'The measurement plan is not fully reflected in Results.', why: 'The reported result cannot be directly correlated with both planned measurements.' },
          { section: 'Results', quote: 'The post-test results are reported for thirty students.', what: 'Results do not identify both planned measurements together.', why: 'The paired pre-test and post-test results are not traceable from this statement.' },
        ],
        recommendations: [{ section: 'Results', original_sentence: 'The post-test results are reported for thirty students.', recommended_revision: 'Report the matching pre-test and post-test results for the thirty students described by the study design.' }],
        reference_list: [
          { section: 'Methodology', sentence: 'The study measures reading comprehension before and after six weeks of guided reading.' },
          { section: 'Results', sentence: 'The post-test results are reported for thirty students.' },
        ],
      },
    },
    {
      order: 4, section_a: 'Results', section_b: 'Conclusion', pair_weight: 1, pair_score: 0.7175, numeric_applicable: true,
      scores: { objectives_alignment: 0.75, methodology_fit: 0.71, numeric_consistency: 0.73, claim_support: 0.68, overall_coherence: 0.7175 },
      skipped_reason: null, culprit_sentences: { section_a: [], section_b: [] },
      explanation: {
        coherence_scores: { overall: 0.7175, objectives: 0.75, methodology: 0.71, numeric: 0.73, claims: 0.68 },
        highlighted_inconsistencies: [], recommendations: [], reference_list: [],
      },
    },
  ],
  inconsistencies_found: 1,
  inconsistencies: [{
    section_a: 'Methodology', section_b: 'Results', pair_order: 3, coherence_score: 70.25,
    explanation_what: 'The Methodology describes a pre-test and post-test design, but the Results do not identify both measurements together.',
    explanation_why: 'The reported result cannot be directly correlated with the measurement plan stated in Methodology.',
    suggested_fix: 'Report the matching pre-test and post-test results for the thirty students described by the study design.',
    inconsistency_id: '44444444-4444-4444-8444-444444444444',
    evidence_a: 'The study measures reading comprehension before and after six weeks of guided reading.',
    evidence_b: 'The post-test results are reported for thirty students.',
    evidence_quotes: [
      { section: 'Methodology', text: 'The study measures reading comprehension before and after six weeks of guided reading.' },
      { section: 'Results', text: 'The post-test results are reported for thirty students.' },
    ],
    evidence_verified: true, finding_status: 'material_issue',
  }],
  recommendations: [{
    recommendation_id: '55555555-5555-4555-8555-555555555555',
    section_a: 'Methodology', section_b: 'Results', pair_order: 3,
    original_sentence: 'The post-test results are reported for thirty students.',
    recommended_revision: 'Report the matching pre-test and post-test results for the thirty students described by the study design.',
    recommendation_text: 'Report the matching pre-test and post-test results for the thirty students described by the study design.',
    recommendation_priority: 'High',
  }],
  ai_synthesis: {
    summary: 'The Abstract-to-Introduction and Introduction-to-Methodology pairs show clear correlation. Methodology-to-Results is the weakest pair because the planned measurements are not both identified in the reported result. Results-to-Conclusion is moderately correlated.',
    strongest_pair: { order: 2, section_a: 'Introduction', section_b: 'Methodology', overall_coherence: 0.82, score: 82 },
    weakest_pair: { order: 3, section_a: 'Methodology', section_b: 'Results', overall_coherence: 0.7025, score: 70.25 },
  },
  citations_audited: 1,
  citations: [{
    citation_raw_reference_text: 'Smith, J. (2024). Guided reading outcomes. Journal of Learning, 12(2), 20-30.',
    citation_is_accessible: true, citation_status: 'verified_metadata', citation_primary_link: 'https://example.edu/smith-2024',
    citation_authors_parsed: 'Smith', citation_year_parsed: 2024, citation_crossref_title: 'Guided reading outcomes',
    citation_title_match_score: 0.96, citation_is_cited_in_text: true,
  }],
  score_breakdown: {
    overall_score: 75.5, band: 'Solid', cross_chapter_coherence_score: 75.5, citation_integrity_score: 82.4,
    dimensions: { objectives_alignment: 0.7925, methodology_fit: 0.77, numeric_consistency: 0.745, claim_support: 0.7125 },
    dimension_weights: { objectives_alignment: 0.25, methodology_fit: 0.25, claim_support: 0.25, numeric_consistency: 0.25 },
    citation_detail: { well_formed_ratio: 1, link_resolution_rate: 1, cross_match_score: 0.96, total_entries: 1 },
  },
  ai_text_indicator: {
    overall_score: 43.2, section_scores: { Abstract: 42.1, Introduction: 44, Methodology: 45.8, Results: 40.3, Conclusion: 43 },
    flagged_sections: [], disclaimer: 'Advisory only, not an academic-integrity determination.',
  },
  db_save_status: 'success', notification_dispatched: true, credits_remaining: 4,
};
