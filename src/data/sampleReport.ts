import type { CitationReport } from '../services/api';
import type { ManuscriptFlowPair, V7Inconsistency, V7Recommendation, V7ScanResponse } from '../services/v7Result';

export interface Citation {
  id: string;
  ref: string;
  url: string;
  status: 'public' | 'private';
  title?: string;
  authors?: string;
  year?: number | string;
}

const TITLE = 'Predictors of Academic Burnout Among STEM Undergraduates';

const REFERENCES = `Reyes, M. A., & Santos, L. D. (2022). Academic burnout patterns among engineering undergraduates in Metro Manila. Philippine Journal of Learning Sciences, 14(1), 33-48. https://doi.org/10.1000/pjls.2022.1401
Dela Cruz, A. T. (2021). Sleep regularity and exhaustion in STEM students. Asian Review of Student Affairs, 8(2), 101-117. https://journals.example.edu/arsa/article/view/8-2-101
Villanueva, K. R. (2020). Study planning and self-regulation in first-year science students. Journal of Higher Education Practice, 19(4), 210-228. https://doi.org/10.1000/jhep.2020.1904
Bautista, J. P., Mendoza, C. L., & Tan, R. S. (2023). Workload, support, and burnout: A three-wave panel study. International Journal of Academic Wellbeing, 6(3), 45-63. https://example.com/ijaw/6-3-45
Gonzales, P. M. (2019). Measuring academic burnout: Validation of a student instrument. Educational Measurement Quarterly, 27(2), 88-104. https://doi.org/10.1000/emq.2019.2702
Ramos, E. F. (2024). Structured planning routines and wellbeing among undergraduates. Campus Health Review, 11(1), 12-29. https://example.org/chr/11-1-12
Lim, S. H., & Navarro, D. C. (2018). Weekly goal setting and academic strain: A quasi-experimental pilot. Journal of Study Skills Research, 4(2), 57-71. https://doi.org/10.1000/jssr.2018.0402
Aquino, M. B. (2022). Support networks and exhaustion among capstone students. Philippine Review of Student Development, 9(2), 140-158. https://example.org/prsd/9-2-140`;

const SECTIONS = {
  intro: `Academic burnout is a state of emotional exhaustion, cynicism toward schoolwork, and a reduced sense of academic efficacy that develops when students face sustained demands over a long period. Among undergraduates in science, technology, engineering, and mathematics (STEM) programs, these demands are heavier because laboratory schedules, dense course loads, and licensure-oriented requirements overlap. This chapter presents the background, the problem, the objectives, and the scope of the study.`,
  background: `Burnout among students has drawn growing attention in Philippine higher education since 2019, as course requirements have become more demanding. Students in engineering, computer science, and the health sciences often report heavier workloads than students in other programs, and many of them balance coursework with part-time work or family responsibilities.
Previous studies describe academic burnout as a combination of exhaustion, cynicism, and low academic efficacy. Exhaustion is the dimension most consistently reported, and it is usually followed by a sense that effort no longer leads to results. When these symptoms persist, they are associated with lower class participation, delayed submissions, and irregular attendance.
Despite this attention, many local studies measure burnout without examining the study routines that students control directly. Time management, sleep regularity, and the spacing of study sessions may therefore be important predictors. This study examines whether these routines, together with course load and perceived support, are associated with burnout among STEM undergraduates.`,
  problem: `This study sought to answer the following 3 questions. What is the level of academic burnout among STEM undergraduates? Do study planning, sleep regularity, course load, and perceived support predict academic burnout? Which of these predictors contributes most to the variation in burnout scores?`,
  objectives: `The study specifically aimed to:
Profile 120 respondents by year level and program
Determine the level of academic burnout
Identify predictors of burnout in study habits
Assess perceived usefulness of a study-planning prototype`,
  scope: `The study covers undergraduate students in all programs of the university during the second semester of the 2025-2026 academic year. It relies on a self-report questionnaire and does not measure academic performance or course completion directly. The results describe associations at one point in time and should not be read as causal effects.`,
  literatureIntro: `This chapter reviews studies on academic burnout, study habits, and the factors that predict strain among undergraduate students. The review is organized around the dimensions of burnout and the predictors examined in this study.`,
  related: `The three-dimension model of burnout is the most widely used framework in student research. Studies that apply the model to undergraduates often report exhaustion as the first dimension to rise, followed by cynicism toward coursework and a decline in perceived academic efficacy.
Several local studies link irregular sleep and long unstructured study hours to higher exhaustion among engineering students. These studies, however, rely on single-time measurements, which limit any claim about the direction of the relationship.
Study-planning routines have been reported to reduce strain when students set weekly targets and review their progress. Evidence from these studies is mixed, and few have tested planning routines together with sleep and support variables in a single model. This gap is the basis for the predictor model used in this study.`,
  methodIntro: `This chapter describes the research design, the respondents and sampling procedure, the instrument, and the procedure used to collect and analyze the data.`,
  design: `The study used a descriptive-correlational design. A self-administered questionnaire was distributed in two waves, six weeks apart, to measure academic burnout and the candidate predictors. Each wave took about 15 minutes to complete.
Multiple linear regression was used to estimate the contribution of each predictor to burnout scores. Results were considered statistically significant at the 0.05 level of significance.`,
  respondents: `A total of 120 respondents completed the questionnaire. They were enrolled as undergraduates in four STEM programs: civil engineering, computer science, chemistry, and biology.
Stratified random sampling was used so that each program and year level was represented. The sample size was computed at a 95% confidence level with a 5% margin of error. In total, 120 questionnaires were retained after screening incomplete responses.`,
  results: `Of the respondents, 108 provided complete data and were included in the analysis. Most were second- and third-year students, and about six in ten were enrolled in engineering programs.
Overall, 78% of respondents reported moderate to high burnout. The mean burnout score was 3.42 on a five-point scale, which indicates moderate burnout overall.
Table 1 presents the standardized coefficients for each predictor.
Predictor    Beta    p-value
Course load    0.31    .002
Sleep regularity    -0.22    .018
Study planning    -0.27    .006
Perceived support    -0.19    .041
Study planning and sleep regularity showed the expected negative associations with burnout. Course load showed the strongest positive association with exhaustion, which supports the view that workload is the main driver of strain.`,
  conclusion: `The findings establish that study planning eliminates burnout among STEM undergraduates. Because 78% of respondents reported moderate to high burnout, the prototype should be adopted by all programs in the university.
Future researchers are encouraged to test the prototype in a controlled setting and to include academic performance as an outcome. Students may also be advised to review their weekly schedules with their advisers.`,
};

const SECTION_TEXT = [
  ['Chapter I: Introduction', SECTIONS.intro],
  ['Background of the Study', SECTIONS.background],
  ['Statement of the Problem', SECTIONS.problem],
  ['Objectives of the Study', SECTIONS.objectives],
  ['Scope and Limitations', SECTIONS.scope],
  ['Chapter II: Review of Related Literature', SECTIONS.literatureIntro],
  ['Related Studies', SECTIONS.related],
  ['Chapter III: Methodology', SECTIONS.methodIntro],
  ['Research Design', SECTIONS.design],
  ['Respondents and Sampling', SECTIONS.respondents],
  ['Chapter IV: Results and Discussion', SECTIONS.results],
  ['Chapter V: Conclusion and Recommendations', SECTIONS.conclusion],
  ['References', REFERENCES],
] as const;

const manuscript_sections = SECTION_TEXT.map(([name, text]) => ({ name, text }));

export const SAMPLE_MANUSCRIPT = [TITLE, ...SECTION_TEXT.map(([name, text]) => `${name}\n${text}`)].join('\n\n');

const SCOPE_SENTENCE = 'The study covers undergraduate students in all programs of the university during the second semester of the 2025-2026 academic year.';
const PROTOTYPE_AIM = 'Assess perceived usefulness of a study-planning prototype';
const SAMPLE_SCREENING = 'In total, 120 questionnaires were retained after screening incomplete responses.';
const SAMPLE_RESULTS = 'Of the respondents, 108 provided complete data and were included in the analysis.';
const BURNOUT_78 = 'Overall, 78% of respondents reported moderate to high burnout.';
const CAUSAL_CLAIM = 'The findings establish that study planning eliminates burnout among STEM undergraduates.';
const GAP_CLAIM = 'Despite this attention, many local studies measure burnout without examining the study routines that students control directly.';
const STRATA_CLAIM = 'Stratified random sampling was used so that each program and year level was represented.';
const PROTOTYPE_ADOPT = 'Because 78% of respondents reported moderate to high burnout, the prototype should be adopted by all programs in the university.';

const MANUSCRIPT_FLOW: ManuscriptFlowPair[] = [
  {
    order: 1, section_a: 'Chapter I: Introduction', section_b: 'Background of the Study', pair_weight: 1, pair_score: 0.88, numeric_applicable: false,
    scores: { objectives_alignment: 0.9, methodology_fit: 0.86, numeric_consistency: null, claim_support: 0.88, overall_coherence: 0.88 },
    skipped_reason: null, culprit_sentences: { section_a: [], section_b: [] }, explanation: null,
  },
  {
    order: 2, section_a: 'Background of the Study', section_b: 'Statement of the Problem', pair_weight: 1, pair_score: 0.8, numeric_applicable: true,
    scores: { objectives_alignment: 0.82, methodology_fit: 0.78, numeric_consistency: 0.74, claim_support: 0.86, overall_coherence: 0.8 },
    skipped_reason: null, culprit_sentences: { section_a: [], section_b: [] },
    explanation: {
      coherence_scores: { overall: 0.8, objectives: 0.82, methodology: 0.78, numeric: 0.74, claims: 0.86 },
      link_summary: 'The background sets up a gap in study routines, but no local study is cited for that gap.',
      comparison: { a_says: 'says many local studies measure burnout without study routines', b_says: 'asks three questions about predictors of burnout' },
      highlighted_inconsistencies: [],
      recommendations: [{ section: 'Background of the Study', original_sentence: GAP_CLAIM, recommended_revision: 'Cite the local studies that measured burnout without study routines, or narrow the claim to what they show.' }],
      reference_list: [{ section: 'Background of the Study', sentence: GAP_CLAIM }],
    },
  },
  {
    order: 3, section_a: 'Statement of the Problem', section_b: 'Objectives of the Study', pair_weight: 1, pair_score: 0.87, numeric_applicable: true,
    scores: { objectives_alignment: 0.88, methodology_fit: 0.84, numeric_consistency: 0.9, claim_support: 0.86, overall_coherence: 0.87 },
    skipped_reason: null, culprit_sentences: { section_a: [], section_b: [] }, explanation: null,
  },
  {
    order: 4, section_a: 'Objectives of the Study', section_b: 'Scope and Limitations', pair_weight: 1, pair_score: 0.64, numeric_applicable: true,
    scores: { objectives_alignment: 0.58, methodology_fit: 0.64, numeric_consistency: 0.72, claim_support: 0.63, overall_coherence: 0.64 },
    skipped_reason: null,
    culprit_sentences: {
      section_a: [{ sentence: PROTOTYPE_AIM, delta: 0.04 }],
      section_b: [{ sentence: SCOPE_SENTENCE, delta: 0.03 }],
    },
    explanation: {
      coherence_scores: { overall: 0.64, objectives: 0.58, methodology: 0.64, numeric: 0.72, claims: 0.63 },
      link_summary: 'The scope names every university program, while the objectives ask about a prototype that the scope never mentions.',
      comparison: { a_says: 'asks about perceived usefulness of a prototype', b_says: 'covers students in every university program' },
      highlighted_inconsistencies: [
        { section: 'Objectives of the Study', quote: PROTOTYPE_AIM, what: 'The objectives ask about a prototype that the scope does not mention.', why: 'The usefulness aim has no matching scope statement or measure.' },
        { section: 'Scope and Limitations', quote: SCOPE_SENTENCE, what: 'The scope covers all programs, but the sample is limited to STEM students.', why: 'Findings would be read as applying to students who were not sampled.' },
      ],
      recommendations: [
        { section: 'Scope and Limitations', original_sentence: SCOPE_SENTENCE, recommended_revision: 'Limit the scope to undergraduate students in STEM programs of the university.' },
        { section: 'Objectives of the Study', original_sentence: PROTOTYPE_AIM, recommended_revision: 'Remove this objective, or add a usefulness measure to the questionnaire.' },
      ],
      reference_list: [
        { section: 'Objectives of the Study', sentence: PROTOTYPE_AIM },
        { section: 'Scope and Limitations', sentence: SCOPE_SENTENCE },
      ],
    },
  },
  {
    order: 5, section_a: 'Scope and Limitations', section_b: 'Chapter II: Review of Related Literature', pair_weight: 1, pair_score: 0.74, numeric_applicable: false,
    scores: { objectives_alignment: 0.76, methodology_fit: 0.72, numeric_consistency: null, claim_support: 0.74, overall_coherence: 0.74 },
    skipped_reason: null, culprit_sentences: { section_a: [], section_b: [] }, explanation: null,
  },
  {
    order: 6, section_a: 'Chapter II: Review of Related Literature', section_b: 'Related Studies', pair_weight: 1, pair_score: 0.87, numeric_applicable: false,
    scores: { objectives_alignment: 0.9, methodology_fit: 0.88, numeric_consistency: null, claim_support: 0.84, overall_coherence: 0.87 },
    skipped_reason: null, culprit_sentences: { section_a: [], section_b: [] }, explanation: null,
  },
  {
    order: 7, section_a: 'Related Studies', section_b: 'Chapter III: Methodology', pair_weight: 1, pair_score: 0.72, numeric_applicable: false,
    scores: { objectives_alignment: 0.74, methodology_fit: 0.7, numeric_consistency: null, claim_support: 0.72, overall_coherence: 0.72 },
    skipped_reason: null, culprit_sentences: { section_a: [], section_b: [] }, explanation: null,
  },
  {
    order: 8, section_a: 'Chapter III: Methodology', section_b: 'Research Design', pair_weight: 1, pair_score: 0.9, numeric_applicable: false,
    scores: { objectives_alignment: 0.92, methodology_fit: 0.9, numeric_consistency: null, claim_support: 0.88, overall_coherence: 0.9 },
    skipped_reason: null, culprit_sentences: { section_a: [], section_b: [] }, explanation: null,
  },
  {
    order: 9, section_a: 'Research Design', section_b: 'Respondents and Sampling', pair_weight: 1, pair_score: 0.83, numeric_applicable: true,
    scores: { objectives_alignment: 0.8, methodology_fit: 0.86, numeric_consistency: 0.84, claim_support: 0.82, overall_coherence: 0.83 },
    skipped_reason: null, culprit_sentences: { section_a: [], section_b: [] },
    explanation: {
      coherence_scores: { overall: 0.83, objectives: 0.8, methodology: 0.86, numeric: 0.84, claims: 0.82 },
      link_summary: 'Stratified sampling is named in Respondents and Sampling, but the counts for each stratum are not given.',
      comparison: { a_says: 'uses a descriptive-correlational design', b_says: 'names stratified sampling without per-stratum counts' },
      highlighted_inconsistencies: [],
      recommendations: [{ section: 'Respondents and Sampling', original_sentence: STRATA_CLAIM, recommended_revision: 'Report the number of respondents for each program and year level.' }],
      reference_list: [{ section: 'Respondents and Sampling', sentence: STRATA_CLAIM }],
    },
  },
  {
    order: 10, section_a: 'Respondents and Sampling', section_b: 'Chapter IV: Results and Discussion', pair_weight: 1, pair_score: 0.51, numeric_applicable: true,
    scores: { objectives_alignment: 0.6, methodology_fit: 0.56, numeric_consistency: 0.38, claim_support: 0.5, overall_coherence: 0.51 },
    skipped_reason: null,
    culprit_sentences: {
      section_a: [{ sentence: SAMPLE_SCREENING, delta: 0.03 }],
      section_b: [{ sentence: SAMPLE_RESULTS, delta: 0.04 }],
    },
    explanation: {
      coherence_scores: { overall: 0.51, objectives: 0.6, methodology: 0.56, numeric: 0.38, claims: 0.5 },
      link_summary: 'Results analyze 108 respondents, but Respondents and Sampling says 120 were retained.',
      comparison: { a_says: 'retains 120 questionnaires after screening', b_says: 'analyzes 108 complete responses' },
      highlighted_inconsistencies: [
        { section: 'Respondents and Sampling', quote: SAMPLE_SCREENING, what: 'The methodology retains 120 questionnaires after screening.', why: 'The sample analyzed in Results is smaller, and no reason is given.' },
        { section: 'Chapter IV: Results and Discussion', quote: SAMPLE_RESULTS, what: 'Results analyzes 108 respondents.', why: 'The 12 excluded responses are not explained anywhere in the manuscript.' },
      ],
      recommendations: [
        { section: 'Chapter IV: Results and Discussion', original_sentence: SAMPLE_RESULTS, recommended_revision: 'Explain the 12 excluded responses, or report the same analyzed sample size in both sections.' },
        { section: 'Respondents and Sampling', original_sentence: SAMPLE_SCREENING, recommended_revision: 'State how many responses were screened out and why, then match the analyzed n.' },
      ],
      reference_list: [
        { section: 'Respondents and Sampling', sentence: SAMPLE_SCREENING },
        { section: 'Chapter IV: Results and Discussion', sentence: SAMPLE_RESULTS },
      ],
    },
  },
  {
    order: 11, section_a: 'Chapter IV: Results and Discussion', section_b: 'Chapter V: Conclusion and Recommendations', pair_weight: 1, pair_score: 0.55, numeric_applicable: true,
    scores: { objectives_alignment: 0.74, methodology_fit: 0.58, numeric_consistency: 0.48, claim_support: 0.4, overall_coherence: 0.55 },
    skipped_reason: null,
    culprit_sentences: {
      section_a: [{ sentence: BURNOUT_78, delta: 0.03 }],
      section_b: [{ sentence: CAUSAL_CLAIM, delta: 0.05 }],
    },
    explanation: {
      coherence_scores: { overall: 0.55, objectives: 0.74, methodology: 0.58, numeric: 0.48, claims: 0.4 },
      link_summary: 'The conclusion states a causal effect and a prevalence figure that the results do not support.',
      comparison: { a_says: 'reports 78% prevalence and a correlational association', b_says: 'claims that planning eliminates burnout' },
      highlighted_inconsistencies: [
        { section: 'Chapter IV: Results and Discussion', quote: BURNOUT_78, what: 'Results report prevalence, not an effect of any intervention.', why: 'A prevalence figure cannot show that planning reduces or eliminates burnout.' },
        { section: 'Chapter V: Conclusion and Recommendations', quote: CAUSAL_CLAIM, what: 'The conclusion claims that planning eliminates burnout.', why: 'A correlational design supports an association, not elimination.' },
      ],
      recommendations: [
        { section: 'Chapter V: Conclusion and Recommendations', original_sentence: CAUSAL_CLAIM, recommended_revision: 'The findings suggest that study planning is associated with lower burnout among STEM undergraduates.' },
        { section: 'Chapter V: Conclusion and Recommendations', original_sentence: PROTOTYPE_ADOPT, recommended_revision: 'Limit the recommendation to a pilot in STEM programs, and describe 78% as prevalence only.' },
      ],
      reference_list: [
        { section: 'Chapter IV: Results and Discussion', sentence: BURNOUT_78 },
        { section: 'Chapter V: Conclusion and Recommendations', sentence: CAUSAL_CLAIM },
      ],
    },
  },
  {
    order: 12, section_a: 'Chapter V: Conclusion and Recommendations', section_b: 'References', pair_weight: 1, pair_score: 0.79, numeric_applicable: true,
    scores: { objectives_alignment: 0.8, methodology_fit: 0.76, numeric_consistency: 0.8, claim_support: 0.8, overall_coherence: 0.79 },
    skipped_reason: null, culprit_sentences: { section_a: [], section_b: [] }, explanation: null,
  },
];

const INCONSISTENCIES: V7Inconsistency[] = [
  {
    section_a: 'Objectives of the Study', section_b: 'Scope and Limitations', pair_order: 4, coherence_score: 64,
    explanation_what: 'The objectives ask about a prototype, but the scope describes all university programs and does not mention a prototype.',
    explanation_why: 'A reader cannot tell which population the findings describe, or whether the prototype aim is in scope.',
    suggested_fix: 'Restate the scope as STEM undergraduates and align the objectives with the measures in the questionnaire.',
    inconsistency_id: '44444444-4444-4444-8444-444444444401',
    evidence_a: PROTOTYPE_AIM, evidence_b: SCOPE_SENTENCE,
    evidence_quotes: [{ section: 'Objectives of the Study', text: PROTOTYPE_AIM }, { section: 'Scope and Limitations', text: SCOPE_SENTENCE }],
    evidence_verified: true, finding_status: 'material_issue',
  },
  {
    section_a: 'Respondents and Sampling', section_b: 'Chapter IV: Results and Discussion', pair_order: 10, coherence_score: 51,
    explanation_what: 'Methodology retains 120 questionnaires, but Results analyzes 108 respondents without explaining the difference.',
    explanation_why: 'The reported result cannot be traced back to the sample described in Methodology.',
    suggested_fix: 'Explain the 12 excluded responses and report one analyzed sample size in both sections.',
    inconsistency_id: '44444444-4444-4444-8444-444444444402',
    evidence_a: SAMPLE_SCREENING, evidence_b: SAMPLE_RESULTS,
    evidence_quotes: [{ section: 'Respondents and Sampling', text: SAMPLE_SCREENING }, { section: 'Chapter IV: Results and Discussion', text: SAMPLE_RESULTS }],
    evidence_verified: true, finding_status: 'material_issue',
  },
  {
    section_a: 'Chapter IV: Results and Discussion', section_b: 'Chapter V: Conclusion and Recommendations', pair_order: 11, coherence_score: 55,
    explanation_what: 'The results report an association and a prevalence figure, but the conclusion states that planning eliminates burnout.',
    explanation_why: 'A correlational result does not support a claim of elimination or effectiveness.',
    suggested_fix: 'Describe the finding as an association and limit the recommendation to a pilot.',
    inconsistency_id: '44444444-4444-4444-8444-444444444403',
    evidence_a: BURNOUT_78, evidence_b: CAUSAL_CLAIM,
    evidence_quotes: [{ section: 'Chapter IV: Results and Discussion', text: BURNOUT_78 }, { section: 'Chapter V: Conclusion and Recommendations', text: CAUSAL_CLAIM }],
    evidence_verified: true, finding_status: 'material_issue',
  },
];

const rec = (n: number, pair: number, section: string, a: string, b: string, original: string, issue: string, revision: string, priority: V7Recommendation['recommendation_priority']): V7Recommendation => ({
  id: `r-${pair}-${n}`, section, recommendation_id: `55555555-5555-4555-8555-555555555${String(pair).padStart(2, '0')}${n}`,
  section_a: a, section_b: b, pair_order: pair, original_sentence: original, issue,
  recommended_revision: revision, recommendation_text: revision, recommendation_priority: priority,
});

const RECOMMENDATIONS: V7Recommendation[] = [
  rec(1, 2, 'Background of the Study', 'Background of the Study', 'Statement of the Problem', GAP_CLAIM,
    'The gap is claimed, but no local study is cited to support it.',
    'Cite the local studies that measured burnout without study routines, or narrow the claim to what they show.', 'Medium'),
  rec(1, 4, 'Scope and Limitations', 'Objectives of the Study', 'Scope and Limitations', SCOPE_SENTENCE,
    'The scope covers all programs, but the objectives and sample are limited to STEM.',
    'Limit the scope to undergraduate students in STEM programs of the university.', 'High'),
  rec(2, 4, 'Objectives of the Study', 'Objectives of the Study', 'Scope and Limitations', PROTOTYPE_AIM,
    'No measure of prototype usefulness appears in the methodology.',
    'Remove this objective, or add a usefulness measure to the questionnaire.', 'High'),
  rec(1, 9, 'Respondents and Sampling', 'Research Design', 'Respondents and Sampling', STRATA_CLAIM,
    'Stratified sampling is named, but the count per stratum is not reported.',
    'Report the number of respondents for each program and year level.', 'Medium'),
  rec(1, 10, 'Chapter IV: Results and Discussion', 'Respondents and Sampling', 'Chapter IV: Results and Discussion', SAMPLE_RESULTS,
    'Results analyze 108 respondents, but Respondents and Sampling says 120 were retained.',
    'Explain the 12 excluded responses, or report the same analyzed sample size in both sections.', 'High'),
  rec(2, 10, 'Respondents and Sampling', 'Respondents and Sampling', 'Chapter IV: Results and Discussion', SAMPLE_SCREENING,
    'The screening step is stated, but the exclusions are not accounted for.',
    'State how many responses were screened out and why, then match the analyzed n.', 'High'),
  rec(1, 11, 'Chapter V: Conclusion and Recommendations', 'Chapter IV: Results and Discussion', 'Chapter V: Conclusion and Recommendations', CAUSAL_CLAIM,
    'A correlational design cannot establish that planning eliminates burnout.',
    'The findings suggest that study planning is associated with lower burnout among STEM undergraduates.', 'High'),
  rec(2, 11, 'Chapter V: Conclusion and Recommendations', 'Chapter IV: Results and Discussion', 'Chapter V: Conclusion and Recommendations', PROTOTYPE_ADOPT,
    'The 78% figure describes prevalence, not an effect of the prototype.',
    'Limit the recommendation to a pilot in STEM programs, and describe 78% as prevalence only.', 'High'),
];

const cite = (raw: string, accessible: boolean, link: string, authors: string, year: number, title: string, match: number, cited: boolean): CitationReport => ({
  citation_raw_reference_text: raw, citation_is_accessible: accessible,
  citation_status: accessible ? 'verified_metadata' : 'not_accessible', citation_primary_link: link,
  citation_authors_parsed: authors, citation_year_parsed: year, citation_crossref_title: title,
  citation_title_match_score: match, citation_is_cited_in_text: cited,
});

const [REF_REYES, REF_DELA_CRUZ, REF_VILLANUEVA, REF_BAUTISTA, REF_GONZALES, REF_RAMOS, REF_LIM, REF_AQUINO] = REFERENCES.split('\n');

const CITATIONS: CitationReport[] = [
  cite(REF_REYES, true, 'https://doi.org/10.1000/pjls.2022.1401', 'Reyes, M. A., & Santos, L. D.', 2022, 'Academic burnout patterns among engineering undergraduates in Metro Manila', 0.97, true),
  cite(REF_DELA_CRUZ, true, 'https://journals.example.edu/arsa/article/view/8-2-101', 'Dela Cruz, A. T.', 2021, 'Sleep regularity and exhaustion in STEM students', 0.94, true),
  cite(REF_VILLANUEVA, false, 'https://doi.org/10.1000/jhep.2020.1904', 'Villanueva, K. R.', 2020, 'Study planning and self-regulation in first-year science students', 0.91, true),
  cite(REF_BAUTISTA, true, 'https://example.com/ijaw/6-3-45', 'Bautista, J. P., Mendoza, C. L., & Tan, R. S.', 2023, 'Workload, support, and burnout: A three-wave panel study', 0.96, true),
  cite(REF_GONZALES, false, 'https://doi.org/10.1000/emq.2019.2702', 'Gonzales, P. M.', 2019, 'Measuring academic burnout: Validation of a student instrument', 0.93, true),
  cite(REF_RAMOS, true, 'https://example.org/chr/11-1-12', 'Ramos, E. F.', 2024, 'Structured planning routines and wellbeing among undergraduates', 0.95, true),
  cite(REF_LIM, false, 'https://doi.org/10.1000/jssr.2018.0402', 'Lim, S. H., & Navarro, D. C.', 2018, 'Weekly goal setting and academic strain: A quasi-experimental pilot', 0.89, true),
  cite(REF_AQUINO, true, 'https://example.org/prsd/9-2-140', 'Aquino, M. B.', 2022, 'Support networks and exhaustion among capstone students', 0.92, false),
];

export const SAMPLE_REPORT: V7ScanResponse = {
  status: 'completed',
  analysis_run_id: '11111111-1111-4111-8111-111111111111',
  user_id: '22222222-2222-4222-8222-222222222222',
  manuscript_id: '33333333-3333-4333-8333-333333333333',
  doc_url: 'predictors-academic-burnout-stem.docx',
  manuscript_title: TITLE,
  result_version: 'v7',
  access: { unlocked: true, unlock_cost: 1, locked_counts: { sections: 0, recommendations: 0, citations: 0 } },
  manuscript_sections,
  overall_coherence_score: 74.5,
  sections_analyzed: manuscript_sections.map(section => section.name),
  manuscript_flow: MANUSCRIPT_FLOW,
  inconsistencies_found: INCONSISTENCIES.length,
  inconsistencies: INCONSISTENCIES,
  recommendations: RECOMMENDATIONS,
  ai_synthesis: {
    summary: 'The Introduction to Background and the Statement of the Problem to Objectives pairs connect clearly, and so do the Methodology and Research Design pairs. The weakest link is between Respondents and Sampling and Results, where 120 retained respondents become 108 analyzed respondents without an explanation. Results to Conclusion is also weak because the conclusion states a causal claim that a correlational design cannot support.',
    strongest_pair: { order: 8, section_a: 'Chapter III: Methodology', section_b: 'Research Design', overall_coherence: 0.9, score: 90 },
    weakest_pair: { order: 10, section_a: 'Respondents and Sampling', section_b: 'Chapter IV: Results and Discussion', overall_coherence: 0.51, score: 51 },
  },
  citations_audited: CITATIONS.length,
  citations: CITATIONS,
  score_breakdown: {
    overall_score: 74.5, band: 'Solid', cross_chapter_coherence_score: 74.5, citation_integrity_score: 84.4,
    dimensions: { objectives_alignment: 0.7867, methodology_fit: 0.7567, numeric_consistency: 0.6943, claim_support: 0.7442 },
    dimension_weights: { objectives_alignment: 0.25, methodology_fit: 0.25, claim_support: 0.25, numeric_consistency: 0.25 },
    critical_penalty: 0,
    citation_detail: { well_formed_ratio: 1, link_resolution_rate: 0.625, cross_match_score: 0.91, total_entries: 8 },
  },
  ai_text_indicator: {
    overall_score: 14.6,
    section_scores: { 'Chapter I: Introduction': 12.8, 'Background of the Study': 15.1, 'Statement of the Problem': 13.4, 'Objectives of the Study': 11.9, 'Scope and Limitations': 14.2, 'Chapter II: Review of Related Literature': 16.0, 'Related Studies': 17.3, 'Chapter III: Methodology': 12.2, 'Research Design': 13.7, 'Respondents and Sampling': 15.6, 'Chapter IV: Results and Discussion': 14.9, 'Chapter V: Conclusion and Recommendations': 16.4 },
    flagged_sections: [], disclaimer: 'Advisory only, not an academic-integrity determination.',
  },
  db_save_status: 'success', notification_dispatched: true, credits_remaining: 4,
};
