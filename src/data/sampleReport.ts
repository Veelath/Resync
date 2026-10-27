import type { RolePairScore, DismissedPair, AITextIndicator } from '../types';

export type AssessmentType = "overall-status" | "strength" | "key-strength" | "major-issue" | "affected-section";

export interface AssessmentItem {
  id: string;
  type: AssessmentType;
  title: string;
  section: string;
  targetSectionIndex: number;
  questionOrSubtitle: string;
  description: string;
  significance: string;
  section_a?: string;
  explanation_what?: string;
  evidence?: string;
  evidence_verified?: boolean;
  conflictsWith?: string;
  conflictQuote?: string;
  objectives_unaddressed?: string[];
  recommendation: string;
  isMissingSection?: boolean;
}

export const ASSESSMENT_ITEMS: AssessmentItem[] = [
  {
    id: "a1",
    type: "overall-status",
    title: "Moderate Coherence",
    section: "Executive Synthesis · Whole Manuscript",
    targetSectionIndex: 0,
    questionOrSubtitle: "What is the actual condition of this manuscript based on the analysis?",
    description: "The manuscript demonstrates generally consistent alignment between the research problem, objectives, methodology, and findings. However, several cross-section inconsistencies were identified, particularly between the research objectives and the stated conclusions. These issues may affect the logical flow and evidentiary support of the manuscript and should be addressed before final submission.",
    significance: "Determines overall academic submission readiness and evidentiary coherence across all chapters.",
    recommendation: "Reconcile identified cross-section inconsistencies between research objectives and stated conclusions before final submission to panel.",
  },
  {
    id: "a2",
    type: "strength",
    title: "Objectives correspond to research problem",
    section: "Chapter 1 — Statement of the Problem",
    targetSectionIndex: 2,
    questionOrSubtitle: "What the manuscript does consistently",
    description: "Research objectives generally correspond to the stated research problem.",
    significance: "Establishes a solid foundational basis for the inquiry, ensuring the research questions directly tackle the core problem.",
    evidence: "The three research questions directly operationalize the inquiry into burnout predictors among undergraduates.",
    recommendation: "Preserve this coherent correspondence in Chapter 1 during panel presentation.",
  },
  {
    id: "a3",
    type: "strength",
    title: "Methodology related to research objectives",
    section: "Chapter 3 — Methodology",
    targetSectionIndex: 5,
    questionOrSubtitle: "What the manuscript does consistently",
    description: "Methodology is generally related to the research objectives.",
    significance: "Validates empirical instrumentation (MBI-SS and AWS) against the stated objectives.",
    evidence: "Data were collected using the Maslach Burnout Inventory–Student Survey (MBI-SS) and Academic Workload Scale (AWS).",
    recommendation: "Keep the instrument reliability and sampling quotas prominently displayed.",
  },
  {
    id: "a4",
    type: "strength",
    title: "Findings address research questions",
    section: "Chapter 4 — Results and Discussion",
    targetSectionIndex: 6,
    questionOrSubtitle: "What the manuscript does consistently",
    description: "Findings address most of the identified research questions.",
    significance: "Confirms that collected empirical data succeeded in answering the core quantitative questions.",
    evidence: "Pearson correlation analysis showed a significant positive relationship between workload and burnout (r=0.61, p<0.001).",
    recommendation: "Retain the descriptive statistics and correlation matrices in the final manuscript.",
  },
  {
    id: "a5",
    type: "major-issue",
    title: "Objective 3 not clearly reflected in findings",
    section: "Chapter 1 → Chapter 4",
    targetSectionIndex: 1,
    questionOrSubtitle: "Most important inconsistencies detected",
    description: "The findings report workload correlation but no moderation analysis for the peer-support objective, leaving that stated aim unanswered.",
    section_a: "Objectives of the Study",
    explanation_what: "Objective 3 is not clearly reflected in the findings.",
    significance: "Panelists will immediately identify that Objective 3 (moderating role of peer support) has no corresponding moderation results in Chapter 4.",
    evidence: "assess the moderating role of peer support on burnout levels among the identified population",
    evidence_verified: true,
    conflictsWith: "Chapter 4 — Results and Discussion",
    conflictQuote: "Pearson correlation analysis showed a significant positive relationship between workload and burnout (r=0.61, p<0.001)",
    objectives_unaddressed: ["Assess the moderating role of peer support on burnout levels among the identified population."],
    recommendation: "Add the moderation regression analysis in Chapter 4, or refine Objective 3 to match the analyzed bivariate data.",
  },
  {
    id: "a6",
    type: "major-issue",
    title: "Conclusion contains unsupported claim",
    section: "Chapter 4 → Chapter 5",
    targetSectionIndex: 7,
    questionOrSubtitle: "Most important inconsistencies detected",
    description: "One conclusion contains a claim that is not directly supported by the reported results.",
    significance: "Recommending peer tutoring as a primary intervention directly contradicts Chapter 4 where peer tutoring showed a null result (p=0.38).",
    conflictsWith: "Chapter 4 — Results and Discussion",
    conflictQuote: "Peer tutoring had no significant effect on algebra scores (p=0.38).",
    recommendation: "Revise Chapter 5 to acknowledge the null finding (p=0.38) and reframe peer tutoring as an area for future research.",
  },
  {
    id: "a7",
    type: "major-issue",
    title: "Repeated concept with different terminology",
    section: "Chapter 1 & Chapter 2",
    targetSectionIndex: 3,
    questionOrSubtitle: "Most important inconsistencies detected",
    description: "A concept is repeated with different terminology across Chapters 1 and 2.",
    significance: "Verbatim definitions and fluctuating terms reduce readability and create editorial redundancy.",
    conflictsWith: "Chapter 2 — Literature Review (Section 2.3 vs 2.6)",
    conflictQuote: "Technology acceptance, defined as the degree to which an individual believes that using a particular system would enhance their performance...",
    recommendation: "Standardize terms across chapters. Keep the authoritative theoretical definition once in Chapter 2 and cross-reference subsequently.",
  },
  {
    id: "a8",
    type: "affected-section",
    title: "Chapter 1 → Chapter 3 (Scope & Methodology)",
    section: "Chapter 1 → Chapter 3",
    targetSectionIndex: 2,
    questionOrSubtitle: "Which chapters/sections are involved",
    description: "Chapter 1 problem statement claims biometric data will be collected, but Chapter 3 methodology describes only online survey instruments.",
    significance: "Discrepancy between promised data collection instruments and actual methodology executed.",
    conflictsWith: "Chapter 3 — Methodology",
    conflictQuote: "Data were collected using the Maslach Burnout Inventory–Student Survey (MBI-SS) and Academic Workload Scale (AWS).",
    recommendation: "Remove biometric claims from Chapter 1 or document the biometric protocol in Chapter 3.",
  },
  {
    id: "a9",
    type: "affected-section",
    title: "Chapter 3 → Chapter 4 (Sample Size & Attrition)",
    section: "Chapter 3 → Chapter 4",
    targetSectionIndex: 5,
    questionOrSubtitle: "Which chapters/sections are involved",
    description: "Chapter 3 methodology reports 120 respondents recruited, but Chapter 4 analyzes only 108 respondents with no attrition explanation.",
    significance: "Panelists will question the missing 12 participants if attrition or exclusion criteria are not stated.",
    conflictsWith: "Chapter 4 — Results and Discussion",
    conflictQuote: "A total of 108 respondents submitted complete responses after data cleaning.",
    recommendation: "Add an attrition note in Chapter 3 explaining why 12 respondents were excluded from the final sample.",
  },
  {
    id: "a10",
    type: "affected-section",
    title: "Chapter 4 → Chapter 5 (Results to Conclusions)",
    section: "Chapter 4 → Chapter 5",
    targetSectionIndex: 7,
    questionOrSubtitle: "Which chapters/sections are involved",
    description: "Chapter 4 null results on peer tutoring conflict with Chapter 5 recommendations to expand peer tutoring as a primary intervention.",
    significance: "Every recommendation in Chapter 5 must logically stem from the empirical results in Chapter 4.",
    conflictsWith: "Chapter 5 — Conclusions and Recommendations",
    conflictQuote: "It is recommended that universities expand the peer tutoring program as a primary intervention strategy.",
    recommendation: "Re-align Chapter 5 recommendations to strictly match empirical findings from Chapter 4.",
  },
];

export interface Citation {
  id: string;
  ref: string;
  url: string;
  status: "public" | "private";
  title?: string;
  authors?: string;
  year?: number | string;
}

export const CITATIONS: Citation[] = [
  { id: "c1", ref: "Bandura, A. (1997). Self-efficacy: The exercise of control.", url: "https://doi.org/10.1002/rrq.121", status: "public" },
  { id: "c2", ref: "Cruz, M. et al. (2023). Digital transformation in Philippine HEIs.", url: "https://journals.pup.edu.ph/index.php/jrm/article/view/1024", status: "private" },
  { id: "c3", ref: "Davis, F.D. (1989). Perceived Usefulness, Perceived Ease of Use.", url: "https://doi.org/10.2307/249008", status: "public" },
  { id: "c4", ref: "Garcia, L. (2022). Capstone completion barriers in ASEAN universities.", url: "https://researchgate.net/publication/360421089", status: "private" },
  { id: "c5", ref: "Reyes, J.A. (2024). Coherence in multi-author research manuscripts.", url: "https://doi.org/10.1016/j.compedu.2024.104801", status: "public" },
  { id: "c6", ref: "Santos, K. & Lim, R. (2023). AI tools in thesis writing workflows.", url: "https://philjol.info/index.php/JPAIR/article/view/7821", status: "public" },
];

export const AI_TEXT_DISCLAIMER =
  'Advisory only, not an academic-integrity determination. This is a stylometric heuristic over surface features and cannot verify authorship. Well-written human academic prose commonly scores 40-60 on this scale; this indicator must never be used to block a submission or as an integrity charge on its own.';

export const SAMPLE_PAIRS: RolePairScore[] = [
  { role_a: "objectives",   role_b: "methodology", weight: 0.22, included: true, score: 86 },
  { role_a: "introduction", role_b: "objectives",  weight: 0.12, included: true, score: 82 },
  { role_a: "methodology",  role_b: "results",     weight: 0.20, included: true, score: 80 },
  { role_a: "results",      role_b: "discussion",  weight: 0.16, included: true, score: 68 },
  { role_a: "objectives",   role_b: "conclusion",  weight: 0.16, included: true, score: 52 },
];

export const SAMPLE_DISMISSED_PAIRS: DismissedPair[] = [
  {
    role_a: "results",
    role_b: "discussion",
    score: 68,
    reason: "The discussion accurately interprets the reported results; the lower text-similarity score does not indicate a material inconsistency."
  }
];

export const SAMPLE_AI_TEXT: AITextIndicator = {
  overall_score: 48,
  section_scores: {
    introduction: 54,
    methodology: 41,
    results: 44,
    discussion: 52,
    conclusion: 49,
  },
  flagged_sections: [],
  disclaimer: AI_TEXT_DISCLAIMER,
};

export interface OverallAssessmentData {
  status: "High Coherence" | "Moderate Coherence" | "Low Coherence";
  question: string;
  statusDescription: string;
  strengths: string[];
  majorIssues: string[];
  affectedSections: {
    label: string;
    from: string;
    to: string;
    targetSectionIndex: number;
    itemId: string;
  }[];
}

export const OVERALL_ASSESSMENT: OverallAssessmentData = {
  status: "Moderate Coherence",
  question: "What is the actual condition of this manuscript based on the analysis?",
  statusDescription:
    "The manuscript demonstrates generally consistent alignment between the research problem, objectives, methodology, and findings. However, several cross-section inconsistencies were identified, particularly between the research objectives and the stated conclusions. These issues may affect the logical flow and evidentiary support of the manuscript and should be addressed before final submission.",
  strengths: [
    "Research objectives generally correspond to the stated research problem.",
    "Methodology is generally related to the research objectives.",
    "Findings address most of the identified research questions.",
  ],
  majorIssues: [
    "Objective 3 is not clearly reflected in the findings.",
    "One conclusion contains a claim that is not directly supported by the reported results.",
    "A concept is repeated with different terminology across Chapters 1 and 2.",
  ],
  affectedSections: [
    { label: "Chapter 1 → Chapter 3", from: "Chapter 1", to: "Chapter 3", targetSectionIndex: 2, itemId: "a8" },
    { label: "Chapter 3 → Chapter 4", from: "Chapter 3", to: "Chapter 4", targetSectionIndex: 5, itemId: "a9" },
    { label: "Chapter 4 → Chapter 5", from: "Chapter 4", to: "Chapter 5", targetSectionIndex: 7, itemId: "a10" },
  ],
};

export const SAMPLE_ADVISORY_DIMENSIONS = {
  objectives_alignment: 0.72,
  methodology_fit: 0.68,
  numeric_consistency: 0.75,
  claim_support: 0.70,
  overall_coherence: 0.74,
};

export interface ParaAssessment { type: AssessmentType; phrase: string; itemId: string; }

export interface Section {
  type: "chapter-heading" | "section";
  chapter: string;
  heading?: string;
  text: string;
  assessments: ParaAssessment[];
}

export const PARAGRAPHS: Section[] = [
  {
    type: "chapter-heading",
    chapter: "Chapter 1",
    heading: "Introduction",
    text: "Academic burnout has emerged as a significant psychological concern among university students worldwide, with particular severity observed in science, technology, engineering, and mathematics (STEM) programs. This study investigates the predictors of academic burnout among STEM undergraduates across Philippine universities, covering both rural and urban settings. The increasing competitive pressure, rigorous coursework, and limited psychosocial support structures in Philippine higher education create conditions that are especially conducive to burnout progression.",
    assessments: [
      { type: "major-issue", phrase: "STEM undergraduates across Philippine universities, covering both rural and urban settings", itemId: "a7" }
    ],
  },
  {
    type: "section",
    chapter: "Chapter 1",
    heading: "Objectives of the Study",
    text: "This study specifically aims to: (1) identify the prevalence of academic burnout among STEM students; (2) determine burnout predictors among students in urban barangays in Metro Manila only; and (3) assess the moderating role of peer support on burnout levels among the identified population.",
    assessments: [
      { type: "major-issue", phrase: "urban barangays in Metro Manila only", itemId: "a7" },
      { type: "major-issue", phrase: "assess the moderating role of peer support on burnout levels among the identified population", itemId: "a5" }
    ],
  },
  {
    type: "section",
    chapter: "Chapter 1",
    heading: "Statement of the Problem",
    text: "Despite growing awareness of mental health issues in tertiary education, few empirical studies have examined the specific predictors of burnout within Philippine STEM contexts. The study will measure student engagement using biometric data collected over one semester to answer three research questions: (1) What is the current burnout level among STEM undergraduates? (2) Which academic and environmental factors best predict burnout? (3) Does peer support moderate the relationship between workload and burnout?",
    assessments: [
      { type: "strength", phrase: "answer three research questions: (1) What is the current burnout level among STEM undergraduates? (2) Which academic and environmental factors best predict burnout?", itemId: "a2" },
      { type: "affected-section", phrase: "measure student engagement using biometric data", itemId: "a8" }
    ],
  },
  {
    type: "chapter-heading",
    chapter: "Chapter 2",
    heading: "Review of Related Literature",
    text: "Technology acceptance, defined as the degree to which an individual believes that using a particular system would enhance their performance, is central to understanding digital tool adoption in education. Several frameworks build on this foundational concept, including the Technology Acceptance Model (TAM) and its extensions, which have been validated across diverse learner populations in Southeast Asian university contexts.",
    assessments: [
      { type: "major-issue", phrase: "Technology acceptance, defined as the degree to which an individual believes that using a particular system would enhance their performance", itemId: "a7" }
    ],
  },
  {
    type: "section",
    chapter: "Chapter 2",
    heading: "Conceptual Framework",
    text: "Technology acceptance, defined as the degree to which an individual believes that using a particular system would enhance their performance, serves as the theoretical anchor for this study's digital-tool adoption model. Building on this definition, the framework positions perceived usefulness and perceived ease of use as mediating variables between environmental stressors and burnout outcomes.",
    assessments: [
      { type: "major-issue", phrase: "Technology acceptance, defined as the degree to which an individual believes that using a particular system would enhance their performance", itemId: "a7" }
    ],
  },
  {
    type: "chapter-heading",
    chapter: "Chapter 3",
    heading: "Methodology",
    text: "A descriptive-correlational research design was employed to examine the relationship between academic workload, peer support, and burnout among university students. Data were collected using the Maslach Burnout Inventory–Student Survey (MBI-SS) and the Academic Workload Scale (AWS). The research instruments were administered via an online survey platform during the second semester of Academic Year 2023–2024. A total of 120 respondents were recruited through stratified random sampling across four Metro Manila universities, with quotas set per year level and degree program.",
    assessments: [
      { type: "strength", phrase: "A descriptive-correlational research design was employed to examine the relationship between academic workload, peer support, and burnout", itemId: "a3" },
      { type: "affected-section", phrase: "A total of 120 respondents were recruited through stratified random sampling", itemId: "a9" }
    ],
  },
  {
    type: "chapter-heading",
    chapter: "Chapter 4",
    heading: "Results and Discussion",
    text: "A total of 108 respondents submitted complete responses after data cleaning and exclusion of incomplete forms. Descriptive statistics revealed that 61% of respondents scored in the high burnout range on the MBI-SS emotional exhaustion subscale. Pearson correlation analysis showed a significant positive relationship between workload and burnout (r=0.61, p<0.001), indicating that heavier perceived workloads are strongly associated with higher burnout levels. Peer tutoring had no significant effect on algebra scores (p=0.38), suggesting that tutoring alone does not improve academic outcomes without structural support.",
    assessments: [
      { type: "affected-section", phrase: "A total of 108 respondents submitted complete responses", itemId: "a9" },
      { type: "strength", phrase: "Pearson correlation analysis showed a significant positive relationship between workload and burnout (r=0.61, p<0.001)", itemId: "a4" },
      { type: "major-issue", phrase: "Peer tutoring had no significant effect on algebra scores (p=0.38)", itemId: "a6" }
    ],
  },
  {
    type: "chapter-heading",
    chapter: "Chapter 5",
    heading: "Conclusions and Recommendations",
    text: "The findings confirm that academic workload is the most consistent predictor of burnout among STEM undergraduates in the sampled institutions. Peer support was found to moderate the workload–burnout relationship only when students had consistent access to structured support programs. It is recommended that universities expand the peer tutoring program as a primary intervention strategy. Student affairs offices should deploy workload monitoring systems across all STEM departments to catch early signs of burnout and deploy timely interventions.",
    assessments: [
      { type: "major-issue", phrase: "expand the peer tutoring program as a primary intervention strategy", itemId: "a6" },
      { type: "affected-section", phrase: "recommends that universities expand the peer tutoring program as a primary intervention strategy", itemId: "a10" }
    ],
  },
];
