import { useState, useEffect, useRef } from "react";
import resyncLogo from "@/imports/Untitled_design__1_.png";
import spacyLogo from "@/assets/technology/spacy.png";
import geminiLogo from "@/assets/technology/gemini.svg";
import type React from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { CitedReference, RolePairScore, AITextIndicator } from './types';
import { type ScanResponse, mapScanResponseToScanResult, executeManuscriptScan, getCreditBalance, getCreditHistory, API_BASE_URL, authHeaders, fetchManuscript } from './services/api';
import { formatRoleLabel, PAR_SCORE } from './utils.js';

type Screen = "home" | "upload" | "processing" | "results" | "login" | "signup" | "dashboard" | "reset-password";
type UploadMode = "file" | "link";
type ResultTab = "manuscript" | "assessment" | "citations";
type ActiveResultsTab = 'overview' | 'inconsistencies' | 'strong_coherence' | 'citations' | 'originality';

type AssessmentType = "overall-status" | "strength" | "major-issue" | "affected-section";

interface AssessmentItem {
  id: string;
  type: AssessmentType;
  title: string;
  section: string;
  targetSectionIndex: number;
  questionOrSubtitle: string;
  description: string;
  significance: string;
  evidence?: string;
  conflictsWith?: string;
  conflictQuote?: string;
  recommendation: string;
}

const ASSESSMENT_ITEMS: AssessmentItem[] = [
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
    description: "Objective 3 is not clearly reflected in the findings.",
    significance: "Panelists will immediately identify that Objective 3 (moderating role of peer support) has no corresponding moderation results in Chapter 4.",
    conflictsWith: "Chapter 4 — Results and Discussion",
    conflictQuote: "Objective 3: assess the moderating role of peer support on burnout levels.",
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

interface Citation {
  id: string;
  ref: string;
  url: string;
  status: "live" | "restricted" | "neutral" | "dead";
  title?: string;
  authors?: string;
  year?: number | string;
}

const CITATIONS: Citation[] = [
  { id: "c1", ref: "Bandura, A. (1997). Self-efficacy: The exercise of control.", url: "https://doi.org/10.1002/rrq.121", status: "live" },
  { id: "c2", ref: "Cruz, M. et al. (2023). Digital transformation in Philippine HEIs.", url: "https://journals.pup.edu.ph/index.php/jrm/article/view/1024", status: "dead" },
  { id: "c3", ref: "Davis, F.D. (1989). Perceived Usefulness, Perceived Ease of Use.", url: "https://doi.org/10.2307/249008", status: "live" },
  { id: "c4", ref: "Garcia, L. (2022). Capstone completion barriers in ASEAN universities.", url: "https://researchgate.net/publication/360421089", status: "dead" },
  { id: "c5", ref: "Reyes, J.A. (2024). Coherence in multi-author research manuscripts.", url: "https://doi.org/10.1016/j.compedu.2024.104801", status: "live" },
  { id: "c6", ref: "Santos, K. & Lim, R. (2023). AI tools in thesis writing workflows.", url: "https://philjol.info/index.php/JPAIR/article/view/7821", status: "live" },
];

const CITE_BADGE: Record<Citation["status"], { label: string; badge: string; row: string }> = {
  live:       { label: "Live",      badge: "bg-emerald-100 text-emerald-700", row: "border-gray-100 bg-gray-50" },
  restricted: { label: "Restricted", badge: "bg-amber-100 text-amber-700",    row: "border-amber-100 bg-amber-50" },
  neutral:    { label: "Neutral",   badge: "bg-slate-200 text-slate-700",     row: "border-slate-200 bg-slate-50" },
  dead:       { label: "Dead link", badge: "bg-red-100 text-red-700",         row: "border-red-100 bg-red-50" },
};

const AI_TEXT_DISCLAIMER =
  'Advisory only, not an academic-integrity determination. This is a stylometric heuristic over surface features and cannot verify authorship. Well-written human academic prose commonly scores 40-60 on this scale; this indicator must never be used to block a submission or as an integrity charge on its own.';

const SAMPLE_PAIRS: RolePairScore[] = [
  { role_a: "objectives",   role_b: "methodology", weight: 0.22, included: true, score: 86 },
  { role_a: "introduction", role_b: "objectives",  weight: 0.12, included: true, score: 82 },
  { role_a: "methodology",  role_b: "results",     weight: 0.20, included: true, score: 80 },
  { role_a: "results",      role_b: "discussion",  weight: 0.16, included: true, score: 68 },
  { role_a: "objectives",   role_b: "conclusion",  weight: 0.16, included: true, score: 52 },
];

const SAMPLE_AI_TEXT: AITextIndicator = {
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

interface OverallAssessmentData {
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

const OVERALL_ASSESSMENT: OverallAssessmentData = {
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

interface ParaAssessment { type: AssessmentType; phrase: string; itemId: string; }

interface Section {
  type: "chapter-heading" | "section";
  chapter: string;
  heading?: string;
  text: string;
  assessments: ParaAssessment[];
}

const PARAGRAPHS: Section[] = [
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


// ─── Tokens ───────────────────────────────────────────────────────────────────
const B = "#1a1fcc";   // brand blue
const BH = "#2d35e8";  // hover
const BL = "#eef0ff";  // light tint

// ─── Primitives ───────────────────────────────────────────────────────────────
function Logo({ className = "" }: { className?: string }) {
  return <img src={resyncLogo} alt="ReSync" className={`object-contain ${className}`} />;
}

function Spinner({ cls = "w-4 h-4" }: { cls?: string }) {
  return <svg className={`${cls} animate-spin`} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" /></svg>;
}

function Eye({ open }: { open: boolean }) {
  return open
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" /></svg>
    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
}

function GIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>;
}

function AssessmentBadge({ type }: { type: AssessmentType }) {
  const m: Record<AssessmentType, { label: string; c: string }> = {
    "overall-status": { label: "Overall Status", c: "bg-amber-50 text-amber-800 border-amber-200" },
    "strength": { label: "Key Strength", c: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    "major-issue": { label: "Major Issue", c: "bg-rose-50 text-rose-800 border-rose-200" },
    "affected-section": { label: "Affected Section", c: "bg-blue-50 text-blue-800 border-blue-200" },
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border mono ${m[type].c}`}>{m[type].label}</span>;
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  const r = 38; const circ = 2 * Math.PI * r;
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626";
  const label = score >= 80 ? "Strong" : score >= 60 ? "Moderate" : "Needs Work";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke={BL} strokeWidth="9" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${(score / 100) * circ} ${circ}`}
            style={{ filter: `drop-shadow(0 0 8px ${color}55)`, transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold mono leading-none" style={{ color }}>{score}</span>
          <span className="text-[10px] text-gray-400 mono">/100</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-gray-500">{label} Coherence</span>
    </div>
  );
}

// ─── Animated keyword ─────────────────────────────────────────────────────────
function Keyword() {
  const words = ["coherent.", "airtight.", "aligned.", "submission‑ready."];
  const [i, setI] = useState(0);
  const [vis, setVis] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setVis(false);
      setTimeout(() => { setI(x => (x + 1) % words.length); setVis(true); }, 280);
    }, 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-block" style={{ transition: "opacity .28s", opacity: vis ? 1 : 0 }}>
      <span className="relative z-10 px-2" style={{ color: B }}>{words[i]}</span>
      <span className="absolute inset-0 rounded-md border-2" style={{ borderColor: B, borderRadius: 7 }} />
      <span className="ml-0.5 inline-block w-0.5 h-[0.85em] align-middle" style={{ background: B, animation: "blink 1s step-end infinite" }} />
    </span>
  );
}

// ─── Product preview card (hero visual) ──────────────────────────────────────
function PreviewCard() {
  return (
    <div className="w-full max-w-md mx-auto" style={{ filter: "drop-shadow(0 24px 48px rgba(26,31,204,0.13))" }}>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
          </div>
          <div className="text-xs text-gray-400 font-medium mono">resync_report.pdf</div>
          <div style={{ width: 48 }} />
        </div>
        {/* score row */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
          <ScoreRing score={74} size={72} />
          <div className="flex-1 space-y-1.5">
            {[
              { label: "Logic Gaps", n: 2, c: "text-violet-600 bg-violet-50 border-violet-200" },
              { label: "Contradictions", n: 2, c: "text-red-600 bg-red-50 border-red-200" },
              { label: "Redundancies", n: 1, c: "text-amber-600 bg-amber-50 border-amber-200" },
            ].map(({ label, n, c }) => (
              <div key={label} className={`flex justify-between items-center text-xs px-2.5 py-1 rounded-lg border ${c}`}>
                <span className="font-medium">{label}</span>
                <span className="font-bold mono">{n}</span>
              </div>
            ))}
          </div>
        </div>
        {/* highlighted passage */}
        <div className="px-5 py-4 space-y-2">
          <div className="text-[10px] mono font-bold text-blue-500 uppercase tracking-widest">Chapter 1 — Statement of the Problem</div>
          <p className="text-xs text-gray-600 leading-relaxed">
            The study aims to{" "}
            <mark className="bg-violet-100 border border-violet-300 text-violet-800 rounded px-0.5 not-italic" style={{ background: undefined, textDecoration: "none" }}>
              measure student engagement using biometric data
            </mark>
            {" "}collected over one semester.
          </p>
          <div className="flex items-start gap-2 mt-2 p-2.5 rounded-xl bg-violet-50 border border-violet-100">
            <div className="w-1 h-full min-h-[32px] rounded-full bg-violet-400 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-violet-700 mb-0.5">Logic Gap — Objectives → Methodology</div>
              <p className="text-[10px] text-violet-600 leading-relaxed">Biometric collection is promised in Objectives but absent from Methodology.</p>
            </div>
          </div>
        </div>
        {/* citation row */}
        <div className="px-5 pb-4 flex gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-[10px] font-semibold text-green-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M5 12l5 5L20 7" /></svg>
            4 live
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[10px] font-semibold text-red-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M18 6L6 18M6 6l12 12" /></svg>
            2 dead
          </div>
          <div className="ml-auto text-[10px] text-gray-400 mono self-center">~2 min scan</div>
        </div>
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function HomeScreen({ onNavigate }: { onNavigate: (s: Screen, asSample?: boolean) => void }) {
  return (
    <div className="min-h-full bg-white">
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 h-16 flex items-center justify-between">
          <Logo className="h-9 w-auto" />
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Overview", id: "section-overview" },
              { label: "Capabilities", id: "section-capabilities" },
              { label: "About", id: "section-about" },
            ].map(l => (
              <button key={l.id} onClick={() => document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth" })} className="px-3.5 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all">{l.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate("login")} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-all">Log in</button>
            <button onClick={() => onNavigate("signup")} className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all" style={{ background: B }}>Sign up free</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* background grid */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(26,31,204,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,31,204,.04) 1px,transparent 1px)`, backgroundSize: "56px 56px" }} />
        {/* top glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-96 pointer-events-none" style={{ background: `radial-gradient(ellipse at center, ${BL} 0%, transparent 70%)` }} />

        <div className="relative w-full px-6 md:px-10 lg:px-16 xl:px-20 pt-20 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* left */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold mb-7" style={{ borderColor: `${B}30`, background: `${B}08`, color: B }}>
                Manuscript coherence checker
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight leading-[1.08] mb-6">
                Check your manuscript<br />
                <span style={{ color: B }}>for coherence.</span>
              </h1>
              <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
                Resync reviews research papers for logic gaps, contradictions, repeated content, and inaccessible citations. Receive a clear report that helps you focus your revisions.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <button onClick={() => onNavigate("signup")}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${B}, ${BH})`, boxShadow: `0 8px 24px ${B}30` }}>
                  Get started free
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => onNavigate("results", true)}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all">
                  View sample report
                </button>
              </div>
              <div className="flex flex-wrap gap-5 text-xs text-gray-400 font-medium">
                {["Free to start", "Results in ~2 min", "No credit card needed"].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-green-500"><path d="M5 12l5 5L20 7" /></svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            {/* right — product preview */}
            <div className="hidden lg:block" style={{ animation: "float 5s ease-in-out infinite" }}>
              <PreviewCard />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className="border-y border-gray-100 bg-gray-50/60">
        <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-5 flex flex-wrap justify-center md:justify-between gap-6">
          {[
            ["6", "Coherence dimensions"],
            ["~2 min", "Per full thesis"],
            [".docx + GDocs", "Accepted formats"],
            ["3 models", "Support the analysis"],
          ].map(([val, label]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xl font-bold mono" style={{ color: B }}>{val}</span>
              <span className="text-sm text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── System overview ── */}
      <section id="section-overview" className="bg-white border-t border-gray-100">
        <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-24">

          {/* Section header */}
          <div className="text-center mb-20">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-5 mono uppercase tracking-widest" style={{ background: `${B}08`, color: B }}>
              System overview
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight">From manuscript<br />to focused revisions</h2>
          </div>

          {/* Overview */}
          <div className="space-y-28">

            {/* ── Upload: text left, visual right ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mono mb-6" style={{ background: `${B}08`, color: B }}>Upload</div>
                <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-4 leading-snug">Upload your manuscript</h3>
                <p className="text-base text-gray-500 leading-relaxed max-w-sm">
                  Add a <span className="font-semibold text-gray-700">.docx file</span> or paste a <span className="font-semibold text-gray-700">Google Docs link</span>. Resync identifies the document's chapters and can compare them with an uploaded school template.
                </p>
                <div className="flex flex-wrap gap-2 mt-6">
                  {["Chapter mapping", "Template support", "Chapter-aware matching"].map(t => (
                    <span key={t} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-green-500 shrink-0"><path d="M5 12l5 5L20 7" /></svg>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Visual: drag-drop card */}
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(26,31,204,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,31,204,.04) 1px,transparent 1px)`, backgroundSize: "32px 32px" }} />
                <div className="relative p-8">
                  {/* Drop zone card */}
                  <div className="bg-white rounded-2xl border-2 border-dashed p-8 text-center shadow-sm" style={{ borderColor: `${B}30` }}>
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: BL }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7" style={{ color: B }}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </div>
                    <p className="text-sm font-bold text-gray-700 mb-1">Drop your thesis here</p>
                    <p className="text-xs text-gray-400">.docx or Google Docs link · max 25 MB</p>
                    <div className="mt-5 flex items-center justify-center gap-2">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs text-gray-300 font-medium">or</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <button className="mt-4 px-5 py-2 rounded-xl text-xs font-bold text-white" style={{ background: `linear-gradient(135deg,${B},${BH})` }}>Browse file</button>
                  </div>
                  {/* Detected sections chip */}
                  <div className="absolute -bottom-4 -right-2 bg-white rounded-2xl border border-gray-100 p-3.5 shadow-lg flex items-start gap-3" style={{ minWidth: 220 }}>
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#f0fdf4" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-green-600"><path d="M5 12l5 5L20 7" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400 mb-2">Detected Sections</p>
                      <div className="flex flex-wrap gap-1.5">
                        {["Introduction", "RRL", "Methodology", "Results", "Conclusion"].map(s => (
                          <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: BL, color: B }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Analysis: visual left, text right ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
              {/* Visual: paragraph scan with glowing connector */}
              <div className="relative order-2 lg:order-1">
                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(26,31,204,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,31,204,.04) 1px,transparent 1px)`, backgroundSize: "32px 32px" }} />
                <div className="relative p-8 space-y-3">
                  {/* Para A */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest mb-2" style={{ color: B }}>Chapter 1 — Objectives</p>
                    <p className="text-xs text-gray-600 leading-relaxed">The study will <mark className="bg-violet-100 border border-violet-200 text-violet-800 rounded px-0.5 not-italic" style={{ textDecoration: "none" }}>measure engagement using biometric data</mark> collected over one semester.</p>
                  </div>
                  {/* SVG connector */}
                  <div className="flex justify-center py-1">
                    <svg width="48" height="36" viewBox="0 0 48 36" fill="none">
                      <path d="M24 2 C 8 2, 8 34, 24 34" stroke={B} strokeWidth="2" strokeDasharray="4 3" fill="none" opacity="0.5" />
                      <circle cx="24" cy="2" r="3" fill={B} opacity="0.6" />
                      <circle cx="24" cy="34" r="3" fill={B} opacity="0.6" />
                      <defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
                    </svg>
                  </div>
                  {/* Para B */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest mb-2" style={{ color: B }}>Chapter 3 — Methodology</p>
                    <p className="text-xs text-gray-600 leading-relaxed">Data were collected using the <span className="font-semibold text-gray-800">Maslach Burnout Inventory</span> and the AWS survey instrument only.</p>
                  </div>
                  {/* Warning badge */}
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white rounded-2xl border border-red-200 shadow-lg px-3.5 py-2.5 flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-red-500"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-red-700">Contradiction Detected</p>
                      <p className="text-[9px] text-gray-400">Objectives ↔ Methodology</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mono mb-6" style={{ background: `${B}08`, color: B }}>Analysis</div>
                <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-4 leading-snug">Review connections across chapters</h3>
                <p className="text-base text-gray-500 leading-relaxed max-w-sm">
                  Resync compares claims, objectives, methods, findings, and conclusions to identify gaps or conflicting information across the manuscript.
                </p>
                <div className="mt-7 space-y-3">
                  {[
                    "Maps document structure and chapter boundaries",
                    "Compares related passages across the manuscript",
                    "Flags findings that need the author's review",
                  ].map(item => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: B }} />
                      <p className="text-sm text-gray-500">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Results: text left, visual right ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mono mb-6" style={{ background: `${B}08`, color: B }}>Results</div>
                <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-4 leading-snug">Review the report</h3>
                <p className="text-base text-gray-500 leading-relaxed max-w-sm">
                  See highlighted passages, explanations, and suggested revisions in one report. Use the findings as guidance while you review and update your paper.
                </p>
                <div className="flex flex-wrap gap-2 mt-6">
                  {["Inline highlights", "Fix suggestions", "Coherence score", "Citation check"].map(t => (
                    <span key={t} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-green-500 shrink-0"><path d="M5 12l5 5L20 7" /></svg>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Visual: score ring + checklist card */}
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(26,31,204,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,31,204,.04) 1px,transparent 1px)`, backgroundSize: "32px 32px" }} />
                <div className="relative p-8">
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center gap-5 pb-5 mb-5 border-b border-gray-50">
                      <ScoreRing score={84} size={88} />
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">Manuscript</p>
                        <p className="text-sm font-bold text-gray-800 leading-snug">Predictors of Academic Burnout Among STEM Undergraduates</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Score improved</span>
                          <span className="text-[10px] text-gray-400">↑ from 74</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400 mb-3">Revision Plan</p>
                    <div className="space-y-2">
                      {[
                        { done: true, text: "Align biometric data collection with Methodology chapter" },
                        { done: true, text: "Reconcile sample size n=120 vs n=108 in Chapter 4" },
                        { done: false, text: "Remove duplicate 'technology acceptance' definition" },
                        { done: false, text: "Revise Conclusions to reflect null tutoring result" },
                      ].map(({ done, text }, i) => (
                        <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-colors ${done ? "bg-green-50" : "bg-gray-50"}`}>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${done ? "bg-green-500" : "border-2 border-gray-300"}`}>
                            {done && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-2.5 h-2.5"><path d="M5 12l5 5L20 7" /></svg>}
                          </div>
                          <p className={`text-xs leading-relaxed ${done ? "text-green-800 line-through decoration-green-400" : "text-gray-600"}`}>{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── AI technologies ── */}
      <section className="border-t border-gray-100 bg-gray-50/40">
        <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-10 lg:gap-16 items-center">
            <div>
              <p className="text-xs mono font-bold uppercase tracking-widest mb-3" style={{ color: B }}>AI technologies used</p>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">Models that support the review</h2>
              <p className="text-sm text-gray-500 leading-relaxed max-w-lg">
                Resync uses AI models to analyze manuscript structure and meaning, then generate findings and revision recommendations. The output is AI-generated and is not fully human-verified. Review each suggestion with your adviser before making changes.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="min-h-28 rounded-2xl border border-gray-200 bg-white p-5 flex items-center justify-center shadow-sm">
                <img src={spacyLogo} alt="spaCy" className="h-14 w-14 object-contain" />
              </div>
              <div className="min-h-28 rounded-2xl border border-gray-200 bg-white p-5 flex items-center justify-center shadow-sm">
                <span className="text-lg font-semibold tracking-tight text-gray-800 whitespace-nowrap">MiniLM-L6-V2</span>
              </div>
              <div className="min-h-28 rounded-2xl border border-gray-200 bg-white p-5 flex items-center justify-center shadow-sm">
                <img src={geminiLogo} alt="Gemini" className="h-10 w-auto max-w-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 checks ── */}
      <section id="section-capabilities" className="border-t border-gray-100 bg-gray-50/40">
        <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-xs mono font-bold uppercase tracking-widest text-gray-400 mb-3">Key capabilities</p>
              <h2 className="text-4xl font-bold text-gray-900 tracking-tight leading-tight">What Resync checks</h2>
            </div>
            <button onClick={() => onNavigate("results", true)} className="text-sm font-semibold hover:underline self-start md:self-auto" style={{ color: B }}>
              View sample report →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {[
              ["01", "Title ↔ Objectives", "Does the title accurately represent what the objectives promise?"],
              ["02", "Objectives ↔ Methodology", "Every objective must map to a concrete data collection method."],
              ["03", "Framework ↔ Findings", "Findings must be grounded in the RRL's theoretical framework."],
              ["04", "Findings ↔ Conclusions", "Conclusions must logically follow from the data shown."],
              ["05", "Terminology Consistency", "Key terms must be defined once and used uniformly across chapters."],
              ["06", "Citation Accessibility", "Every cited URL and DOI is pinged to confirm public reachability."],
            ].map(([num, label, desc]) => (
              <div key={num} className="group flex items-start gap-4 p-5 rounded-2xl border border-transparent hover:border-gray-200 hover:bg-white transition-all cursor-default">
                <span className="text-2xl font-black mono text-gray-100 group-hover:text-blue-100 transition-colors select-none shrink-0 w-9 leading-none mt-0.5">{num}</span>
                <div>
                  <p className="text-sm font-bold text-gray-800 mono mb-1">{label}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="section-about" className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-16">
        <div className="relative rounded-3xl overflow-hidden p-12 md:p-16 text-center" style={{ background: `linear-gradient(160deg, #0d1147, ${B} 55%, ${BH})` }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, rgba(255,255,255,.1) 1px, transparent 1px)`, backgroundSize: "28px 28px" }} />
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(129,140,248,.3) 0%, transparent 70%)" }} />
          <div className="relative z-10">
            <Logo className="h-10 w-auto mx-auto mb-7 brightness-0 invert" />
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">Review your manuscript with Resync</h2>
            <p className="text-blue-200 mb-8 text-sm leading-relaxed max-w-sm mx-auto">Create an account to upload your paper and receive a coherence report.</p>
            <button onClick={() => onNavigate("signup")} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white font-bold text-sm hover:bg-blue-50 transition-all shadow-xl" style={{ color: B }}>
              Get started
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-8 max-w-md mx-auto leading-relaxed">
          Resync is a decision-support tool. Final judgment on your manuscript always rests with your adviser and panel.
        </p>
      </section>
    </div>
  );
}

// ─── Research Types & Standard Templates ──────────────────────────────────────
type ResearchType = "quantitative" | "qualitative";

interface TemplateChapter {
  id: string;
  title: string;
  sections: string[];
}

const DEFAULT_TEMPLATES: Record<ResearchType, TemplateChapter[]> = {
  quantitative: [
    { id: "c1", title: "Chapter 1 — Introduction", sections: ["Background of the Study", "Statement of the Problem", "Research Hypotheses", "Conceptual Framework", "Significance of the Study", "Scope & Delimitations"] },
    { id: "c2", title: "Chapter 2 — Review of Related Literature", sections: ["Theoretical Framework", "Review of Related Literature & Studies", "Synthesis of the State of the Art"] },
    { id: "c3", title: "Chapter 3 — Methodology", sections: ["Research Design", "Population & Sampling Technique", "Instrumentation & Validation", "Data Gathering Procedure", "Statistical Treatment of Data"] },
    { id: "c4", title: "Chapter 4 — Results and Discussion", sections: ["Descriptive Statistical Analysis", "Hypothesis Testing & Correlation", "Interpretation of Findings"] },
    { id: "c5", title: "Chapter 5 — Summary, Conclusions & Recommendations", sections: ["Summary of Findings", "Conclusions", "Recommendations for Practice & Future Research"] },
  ],
  qualitative: [
    { id: "c1", title: "Chapter 1 — Introduction", sections: ["Background & Phenomenon of Interest", "Statement of the Problem", "Central Research Questions", "Significance of the Study", "Epistemological & Reflexive Stance"] },
    { id: "c2", title: "Chapter 2 — Review of Related Literature", sections: ["Conceptual & Thematic Foundations", "Critical Synthesis of Existing Studies", "Theoretical Lens"] },
    { id: "c3", title: "Chapter 3 — Methodology", sections: ["Qualitative Paradigm (Phenomenology/Case Study)", "Informant Selection & Purposive Sampling", "Interview Protocol & Data Generation", "Thematic Analysis Procedures", "Trustworthiness, Credibility & Ethical Considerations"] },
    { id: "c4", title: "Chapter 4 — Emergent Themes & Narrative Findings", sections: ["Core Thematic Findings", "Narrative Synthesis & Participant Quotes", "Cross-Theme Discussion"] },
    { id: "c5", title: "Chapter 5 — Discussion, Conclusions & Implications", sections: ["Synthesis of Emergent Themes", "Theoretical & Practical Implications", "Conclusions", "Recommendations & Future Research Directions"] },
  ],
};

// ─── Upload ───────────────────────────────────────────────────────────────────
async function parseDocxTemplate(file: File): Promise<TemplateChapter[]> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const elements = Array.from(doc.body.children);

  const chapters: TemplateChapter[] = [];
  let chapterIndex = 0;

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    const text = el.textContent?.trim() || '';
    if (!text) continue;

    const isParagraphHeader = tag === 'p' && 
      (text.toUpperCase().startsWith('CHAPTER') || /^\d+\.\s/.test(text));

    if (tag === 'h1' || isParagraphHeader) {
      chapterIndex = chapters.length;
      chapters.push({ id: `c${chapterIndex + 1}`, title: text, sections: [] });
    } else if ((tag === 'h2' || tag === 'h3') && chapters.length > 0) {
      chapters[chapters.length - 1].sections.push(text);
    }
  }

  return chapters.length > 0 ? chapters : [];
}

let lastScanError: string | null = null;

function UploadScreen({ onNavigate, session, onScanComplete }: { onNavigate: (s: Screen) => void; session?: Session | null; onScanComplete?: (result: ScanResponse) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [researchType, setResearchType] = useState<ResearchType | null>(null);
  const [mode, setMode] = useState<UploadMode>("file");
  const [drag, setDrag] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [scanError, setScanError] = useState<string | null>(lastScanError);
  const [isScanning, setIsScanning] = useState(false);
  
  const [customTemplateFile, setCustomTemplateFile] = useState<File | null>(null);
  const [templateParseError, setTemplateParseError] = useState<string | null>(null);
  const customTemplateInputRef = useRef<HTMLInputElement>(null);

  const [templateChapters, setTemplateChapters] = useState<TemplateChapter[]>([]);
  const [editingSection, setEditingSection] = useState<{ cIdx: number; sIdx: number } | null>(null);
  const [newSectionText, setNewSectionText] = useState("");
  const [addingToChapter, setAddingToChapter] = useState<number | null>(null);

  async function handleTemplateFileChange(file: File) {
    setCustomTemplateFile(file);
    setTemplateParseError(null);
    try {
      if (file.name.endsWith('.txt') || file.type === 'text/plain') {
        const text = await file.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
          setTemplateParseError('No headings found in the template. Using default template.');
          setTemplateChapters(researchType ? DEFAULT_TEMPLATES[researchType] : []);
        } else {
          setTemplateChapters([{
            id: "c1",
            title: "Custom Template Sections",
            sections: lines,
          }]);
        }
        return;
      }
      const parsed = await parseDocxTemplate(file);
      if (parsed.length === 0) {
        setTemplateParseError('No headings found in the template. Using default template.');
        setTemplateChapters(researchType ? DEFAULT_TEMPLATES[researchType] : []);
      } else {
        setTemplateChapters(parsed);
      }
    } catch {
      setTemplateParseError('Could not parse the template file. Using default template.');
      setTemplateChapters(researchType ? DEFAULT_TEMPLATES[researchType] : []);
    }
  }

  function handleSelectResearchType(t: ResearchType) {
    setResearchType(t);
    setTemplateChapters(DEFAULT_TEMPLATES[t]);
    lastScanError = null;
    setScanError(null);
  }

  function handleResetTemplate() {
    setTemplateChapters(researchType ? DEFAULT_TEMPLATES[researchType] : []);
    setCustomTemplateFile(null);
    setTemplateParseError(null);
    if (customTemplateInputRef.current) customTemplateInputRef.current.value = '';
  }

  async function handleScan() {
    if (!session?.user) { onNavigate("login"); return; }
    if (!researchType) return;
    lastScanError = null;
    setScanError(null);
    setIsScanning(true);
    let navigatedToProcessing = false;
    try {
      if (mode === "file") {
        if (!uploadedFile) {
          throw new Error("Please select a manuscript file to upload.");
        }
        if (uploadedFile.size === 0) {
          throw new Error("The uploaded document appears to be empty or contains no extractable text.");
        }
        const lowerName = uploadedFile.name.toLowerCase();
        if (!lowerName.endsWith(".docx") && !lowerName.endsWith(".pdf")) {
          throw new Error("This does not look like a research manuscript. Please upload a .docx or .pdf file.");
        }
      } else if (mode === "link") {
        if (!link.trim() || !link.includes("docs.google.com")) {
          throw new Error("Please provide a valid Google Docs link.");
        }
      }

      onNavigate("processing");
      navigatedToProcessing = true;

      const rawSections = templateChapters.flatMap(c => c.sections);
      const templateToc = rawSections.some(s => /^references|bibliography/i.test(s))
        ? rawSections
        : [...rawSections, "References"];
      const result = await executeManuscriptScan({
        user_id: session.user.id,
        file: uploadedFile ?? undefined,
        doc_url: mode === "link" ? link : undefined,
        template_toc: templateToc,
      });
      if (onScanComplete) onScanComplete(result);
    } catch (e: any) {
      console.error(e);
      const errMsg = e?.message || "The scan could not be completed.";
      lastScanError = errMsg;
      setScanError(errMsg);
      setIsScanning(false);
      if (navigatedToProcessing) {
        onNavigate("upload");
      }
    }
  }

  function handleRemoveSection(cIdx: number, sIdx: number) {
    setTemplateChapters(prev => prev.map((ch, i) => i === cIdx ? { ...ch, sections: ch.sections.filter((_, si) => si !== sIdx) } : ch));
  }

  function handleAddSectionSubmit(cIdx: number) {
    if (!newSectionText.trim()) { setAddingToChapter(null); return; }
    setTemplateChapters(prev => prev.map((ch, i) => i === cIdx ? { ...ch, sections: [...ch.sections, newSectionText.trim()] } : ch));
    setNewSectionText("");
    setAddingToChapter(null);
  }

  function handleUpdateSection(cIdx: number, sIdx: number, val: string) {
    setTemplateChapters(prev => prev.map((ch, i) => i === cIdx ? { ...ch, sections: ch.sections.map((s, si) => si === sIdx ? val : s) } : ch));
  }

  const canProceedToStep2 = researchType !== null && (mode === "file" ? !!uploadedFile : link.trim().length > 0);

  function handleStep1Continue() {
    if (!researchType) return;
    if (mode === "file") {
      if (!uploadedFile) {
        setScanError("Please select a manuscript file to upload.");
        return;
      }
      if (uploadedFile.size === 0) {
        setScanError("The uploaded document appears to be empty or contains no extractable text.");
        return;
      }
      const lowerName = uploadedFile.name.toLowerCase();
      if (!lowerName.endsWith(".docx") && !lowerName.endsWith(".pdf")) {
        setScanError("This does not look like a research manuscript. Please upload a .docx or .pdf file.");
        return;
      }
    } else if (mode === "link") {
      if (!link.trim() || !link.includes("docs.google.com")) {
        setScanError("Please provide a valid Google Docs link.");
        return;
      }
    }
    lastScanError = null;
    setScanError(null);
    setStep(2);
  }

  return (
    <div className="min-h-full bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => step === 2 ? setStep(1) : onNavigate("home")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
              {step === 2 ? "Back to Step 1" : "Back"}
            </button>
            <div className="h-5 w-px bg-gray-100" />
            <button onClick={() => onNavigate("home")}><Logo className="h-8 w-auto" /></button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: BL, color: B }}>
              Step {step} of 2: {step === 1 ? "Manuscript & Scope" : "Standard Template"}
            </span>
          </div>
        </div>
      </nav>

      {/* page body */}
      <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-10">

        {/* Step Progress Bar */}
        <div className="mb-8 p-4 rounded-2xl border border-gray-100 bg-gray-50/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStep(1)}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all shadow-sm"
              style={{ background: step === 1 ? B : "#16a34a" }}>
              {step > 1 ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5"><path d="M5 12l5 5L20 7" /></svg>
              ) : "1"}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">1. Manuscript & Research Scope</p>
              <p className="text-[11px] text-gray-400">Select research type & upload .docx</p>
            </div>
          </div>
          <div className="hidden sm:block flex-1 h-0.5 max-w-[80px]" style={{ background: step >= 2 ? B : "#e5e7eb" }} />
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => canProceedToStep2 && setStep(2)}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm"
              style={{ background: step === 2 ? B : "#f3f4f6", color: step === 2 ? "white" : "#9ca3af" }}>
              2
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: step === 2 ? "#111827" : "#6b7280" }}>2. Standard Template (Editable)</p>
              <p className="text-[11px] text-gray-400">Review & customize chapter headings</p>
            </div>
          </div>
          <div className="hidden sm:block flex-1 h-0.5 max-w-[80px] bg-gray-200" />
          <div className="flex items-center gap-3 opacity-60">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gray-100 text-gray-400">
              3
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600">3. Coherence Scan</p>
              <p className="text-[11px] text-gray-400">Cross-chapter report</p>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            STEP 1: MANUSCRIPT INTAKE & RESEARCH SCOPE
        ════════════════════════════════════════════════════════════════ */}
        {step === 1 ? (
          <div>
            <div className="mb-8">
              <p className="text-xs mono font-bold uppercase tracking-widest mb-1.5" style={{ color: B }}>Step 1 · Manuscript Intake</p>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Select research scope & upload manuscript</h1>
              <p className="text-gray-500 text-sm">Choose Quantitative or Qualitative so ReSync loads the matching standard chapter template. You can edit it in Step 2.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
              <div className="space-y-7">

                {/* 1. Research Scope Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs mono font-bold uppercase tracking-widest text-gray-500">Research Type Scope</label>
                    <span className="text-[11px] font-semibold" style={{ color: researchType ? "#16a34a" : "#dc2626" }}>
                      {researchType ? "Selected" : "Required: choose one"}
                    </span>
                  </div>
                  <div role="radiogroup" aria-label="Research methodology" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        type: "quantitative" as const,
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-indigo-600">
                            <path d="M3 3v18h18M7 16v-4M12 16V9M17 16V5" />
                          </svg>
                        ),
                        title: "Quantitative",
                        subtitle: "Numerical data, hypotheses, sampling & statistical tests",
                      },
                      {
                        type: "qualitative" as const,
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-indigo-600">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />
                          </svg>
                        ),
                        title: "Qualitative",
                        subtitle: "Thematic analysis, participant interviews & narrative meaning",
                      },
                    ].map(card => {
                      const isSelected = researchType === card.type;
                      return (
                        <button
                          key={card.type}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => handleSelectResearchType(card.type)}
                          className="p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer"
                          style={{
                            borderColor: isSelected ? B : "#e5e7eb",
                            background: isSelected ? BL : "white",
                            boxShadow: isSelected ? `0 4px 20px ${B}18` : "none",
                          }}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 border border-gray-100">{card.icon}</span>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: B }}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M5 12l5 5L20 7" /></svg>
                                </div>
                              )}
                            </div>
                            <p className="text-sm font-bold text-gray-900">{card.title}</p>
                            <p className="text-xs text-gray-500 mt-1 leading-snug">{card.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Manuscript Source */}
                <div>
                  <label className="text-xs mono font-bold uppercase tracking-widest text-gray-500 block mb-3">Manuscript Source</label>
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    {([
                      [
                        "file",
                        <svg key="file-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-600"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>,
                        "Upload .docx",
                        ".docx · max 25 MB"
                      ],
                      [
                        "link",
                        <svg key="link-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-600"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>,
                        "Google Docs",
                        "Shared view link"
                      ]
                    ] as [UploadMode, React.ReactNode, string, string][]).map(([m, icon, label, sub]) => (
                      <button key={m} onClick={() => { setMode(m); lastScanError = null; setScanError(null); }}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${mode === m ? "bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                        style={{ borderColor: mode === m ? B : undefined }}>
                        <span className="shrink-0">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold" style={{ color: mode === m ? B : "#1f2937" }}>{label}</div>
                          <div className="text-xs text-gray-400">{sub}</div>
                        </div>
                        {mode === m && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: B }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3"><path d="M5 12l5 5L20 7" /></svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Input Dropzone */}
                  {mode === "file" ? (
                    <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) { setUploadedFile(f); lastScanError = null; setScanError(null); } }}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all bg-gray-50/40 hover:bg-gray-50"
                      style={{ borderColor: drag || uploadedFile ? B : "#e5e7eb", background: drag || uploadedFile ? BL : undefined }}>
                      <input ref={fileInputRef} type="file" accept=".docx,.pdf" className="hidden" onChange={e => { setUploadedFile(e.target.files?.[0] ?? null); lastScanError = null; setScanError(null); }} />
                      {uploadedFile ? (
                        <>
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: BL, border: `1px solid ${B}20` }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" style={{ color: B }}><path d="M9 12h6M9 16h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-gray-800">{uploadedFile.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Click to remove or replace file</p>
                          </div>
                          <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-3 py-1 rounded-full">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M5 12l5 5L20 7" /></svg>Manuscript attached
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-gray-700">Drop your .docx or .pdf file here</p>
                            <p className="text-xs text-gray-400 mt-1">or click to browse from device · max 25 MB</p>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-400"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                        </div>
                        <input type="url" value={link} onChange={e => { setLink(e.target.value); lastScanError = null; setScanError(null); }} placeholder="https://docs.google.com/document/d/..."
                          className="w-full h-12 pl-11 pr-4 rounded-xl border-2 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                          style={{ borderColor: link ? B : "#e5e7eb" }}
                          onFocus={e => (e.target.style.borderColor = B)} onBlur={e => (e.target.style.borderColor = link ? B : "#e5e7eb")} />
                      </div>
                      <p className="text-xs text-gray-400">Must be set to <span className="font-semibold text-gray-600">"Anyone with the link can view"</span></p>
                    </div>
                  )}
                </div>

                {/* Continue button */}
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={!canProceedToStep2}
                    onClick={handleStep1Continue}
                    className="w-full h-12 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                    style={{
                      background: canProceedToStep2 ? `linear-gradient(135deg, ${B}, ${BH})` : "#f3f4f6",
                      color: canProceedToStep2 ? "white" : "#9ca3af",
                      cursor: canProceedToStep2 ? "pointer" : "not-allowed",
                      boxShadow: canProceedToStep2 ? `0 8px 24px ${B}30` : "none"
                    }}
                  >
                    Continue to Template Setup (Step 2) →
                  </button>
                  {!researchType && (
                    <p className="text-center text-xs text-gray-400">Select Quantitative or Qualitative to continue</p>
                  )}
                  {scanError && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-red-600 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      <p className="flex-1 leading-snug font-medium">{scanError}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Prep guide */}
              <div className="lg:sticky lg:top-24 space-y-3">
                <div className="rounded-2xl p-5" style={{ background: BL, border: `1px solid ${B}18` }}>
                  <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: `${B}99` }}>Scan preparation</p>
                  <p className="text-sm font-bold text-gray-800 leading-snug">Configuring your scope ensures accurate cross-chapter checking.</p>
                </div>

                {[
                  {
                    n: "1",
                    title: "Choose research scope",
                    body: "Quantitative or Qualitative methodology allows ReSync to apply tailored validation rules.",
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
                  },
                  {
                    n: "2",
                    title: "Upload manuscript",
                    body: ".docx under 25 MB, or Google Docs set to 'Anyone with the link can view'.",
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>,
                  },
                  {
                    n: "3",
                    title: "Standard template edit",
                    body: "In Step 2, you can edit headings in our standard template to match your adviser's guidelines.",
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
                  },
                ].map(({ n, title, body, icon }) => (
                  <div key={n} className="bg-white rounded-2xl p-4 flex gap-3.5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black text-white" style={{ background: `linear-gradient(135deg, ${B}, #4f55f5)` }}>
                        {n}
                      </div>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: BL, color: B }}>
                        {icon}
                      </div>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-[13px] font-bold text-gray-800">{title}</p>
                      <p className="text-[12px] text-gray-400 leading-relaxed mt-0.5">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ════════════════════════════════════════════════════════════════
              STEP 2: STANDARD TEMPLATE (EDITABLE)
          ════════════════════════════════════════════════════════════════ */
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs mono font-bold uppercase tracking-widest" style={{ color: B }}>Step 2 · Chapter Template</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                    {researchType}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Review & edit standard template</h1>
                <p className="text-gray-500 text-sm mt-1">ReSync provides this standard structure based on your scope. You can rename, add, or remove headings to match your school's format.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                  Reset to Standard
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
              {/* Template chapters list */}
              <div className="space-y-4">
                {templateChapters.map((ch, cIdx) => (
                  <div key={ch.id} className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm hover:border-gray-300 transition-all">
                    {/* Chapter header */}
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: B }}>
                          {cIdx + 1}
                        </span>
                        <h3 className="text-sm font-bold text-gray-900">{ch.title}</h3>
                      </div>
                      <span className="text-[11px] font-medium text-gray-400 mono">
                        {ch.sections.length} sections
                      </span>
                    </div>

                    {/* Section pills / editable chips */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {ch.sections.map((sec, sIdx) => {
                        const isEditing = editingSection?.cIdx === cIdx && editingSection?.sIdx === sIdx;
                        return (
                          <div
                            key={sIdx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium bg-gray-50/80 border-gray-200 text-gray-800 transition-colors hover:bg-gray-100/80"
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                value={sec}
                                onChange={e => handleUpdateSection(cIdx, sIdx, e.target.value)}
                                onBlur={() => setEditingSection(null)}
                                onKeyDown={e => { if (e.key === "Enter") setEditingSection(null); }}
                                className="bg-white border border-blue-400 rounded px-1.5 py-0.5 text-xs outline-none min-w-[120px]"
                              />
                            ) : (
                              <span
                                onClick={() => setEditingSection({ cIdx, sIdx })}
                                className="cursor-pointer hover:underline"
                                title="Click to edit heading"
                              >
                                {sec}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(cIdx, sIdx)}
                              className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                              title="Remove section"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                          </div>
                        );
                      })}

                      {/* Add section button / inline form */}
                      {addingToChapter === cIdx ? (
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            autoFocus
                            placeholder="Section heading name…"
                            value={newSectionText}
                            onChange={e => setNewSectionText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") handleAddSectionSubmit(cIdx);
                              if (e.key === "Escape") setAddingToChapter(null);
                            }}
                            className="h-8 px-2.5 rounded-xl border border-blue-400 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSectionSubmit(cIdx)}
                            className="h-8 px-2.5 rounded-xl text-xs font-bold text-white"
                            style={{ background: B }}
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingToChapter(null)}
                            className="h-8 px-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-600 flex items-center justify-center"
                            aria-label="Cancel adding section"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setAddingToChapter(cIdx); setNewSectionText(""); }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M12 5v14M5 12h14" /></svg>
                          Add section
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Optional institutional file override */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-gray-800">Have an institutional .docx or .txt template file?</p>
                    <p className="text-gray-400 text-[11px]">You can optionally upload your school's syllabus or format document (.docx or .txt).</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => customTemplateInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors self-start sm:self-auto bg-white flex items-center gap-1.5"
                    style={{ borderColor: customTemplateFile ? B : "#d1d5db", color: customTemplateFile ? B : "#4b5563" }}
                  >
                    {customTemplateFile ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
                        <span>{customTemplateFile.name}</span>
                      </>
                    ) : "+ Attach template (.docx, .txt) (Optional)"}
                  </button>
                  {templateParseError && (
                    <p className="text-[10px] text-amber-600 max-w-[200px] text-right">{templateParseError}</p>
                  )}
                  <input
                    ref={customTemplateInputRef}
                    type="file"
                    accept=".docx,.txt"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleTemplateFileChange(f);
                      e.target.value = "";
                    }}
                  />
                </div>

                {/* Bottom Navigation Buttons */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setStep(1); lastScanError = null; setScanError(null); }}
                    className="px-5 h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    ← Back to Step 1
                  </button>
                  <button
                    type="button"
                    disabled={isScanning}
                    onClick={handleScan}
                    className="flex-1 h-12 rounded-xl font-bold text-sm text-white transition-all shadow-md flex items-center justify-center gap-2"
                    style={{
                      background: isScanning ? "#9ca3af" : `linear-gradient(135deg, ${B}, ${BH})`,
                      boxShadow: isScanning ? "none" : `0 8px 24px ${B}30`,
                      cursor: isScanning ? "not-allowed" : "pointer"
                    }}
                  >
                    {isScanning ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Scanning manuscript…
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                        Run Coherence Scan (1 Credit) →
                      </>
                    )}
                  </button>
                </div>
                {scanError && (
                  <div className="mt-3 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-red-600 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    <p className="flex-1 leading-snug font-medium">{scanError}</p>
                  </div>
                )}
              </div>

              {/* Right column: Summary Card */}
              <div className="lg:sticky lg:top-24 space-y-4">
                <div className="rounded-2xl p-5 bg-white border border-gray-200 shadow-sm space-y-4">
                  <div>
                    <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400 mb-1">Scan Configuration</p>
                    <h4 className="text-sm font-bold text-gray-900">Manuscript Summary</h4>
                  </div>
                  <div className="space-y-2.5 text-xs border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">File:</span>
                      <span className="font-semibold text-gray-800 truncate max-w-[170px]">{uploadedFile?.name || "Google Docs link"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Scope:</span>
                      <span className="font-bold capitalize" style={{ color: B }}>
                        {researchType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Chapters:</span>
                      <span className="font-semibold text-gray-800">{templateChapters.length} Chapters</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Total Sections:</span>
                      <span className="font-semibold text-gray-800">
                        {templateChapters.reduce((acc, c) => acc + c.sections.length, 0)} Headings
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Credit Cost:</span>
                      <span className="font-bold text-emerald-600">1 Credit</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl p-4 bg-amber-50/70 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                  <p className="font-bold text-amber-900 mb-1">Template Customization Tip</p>
                  Click any heading pill to rename it. Resync will align your manuscript’s headings with this structure to flag skipped sections and out-of-order arguments.
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Processing ───────────────────────────────────────────────────────────────
function ProcessingScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const steps = [
    { label: "Reading your manuscript", dur: 1500 },
    { label: "Checking section alignment", dur: 2500 },
    { label: "Analyzing cross-chapter coherence", dur: 3000 },
    { label: "Verifying citation links", dur: 2000 },
  ];
  const [done, setDone] = useState(0);
  useEffect(() => {
    let t = 0;
    const timers: NodeJS.Timeout[] = [];
    steps.forEach((s, i) => {
      t += s.dur;
      timers.push(setTimeout(() => setDone(i + 1), t));
    });
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);
  const isFinalizing = done >= steps.length;
  const pct = isFinalizing ? 99 : Math.min(99, Math.round((done / steps.length) * 100));

  return (
    <div className="min-h-full bg-white flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-lg">
        {/* logo pulse */}
        <div className="flex justify-center mb-10">
          <div className="relative">
            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: B }} />
            <div className="relative w-20 h-20 rounded-full flex items-center justify-center border-2" style={{ background: BL, borderColor: `${B}30` }}>
              <Logo className="w-12 h-12" />
            </div>
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Analyzing your manuscript</h1>
          <p className="text-sm text-gray-400">Running {steps.length} coherence checks across all chapters</p>
        </div>

        {/* progress */}
        <div className="flex justify-between items-center mb-2">
          {pct === 99 ? (
            <span className="text-xs mono font-semibold animate-pulse flex items-center gap-1.5" style={{ color: B }}>
              <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: B }} />
              Finalizing your report…
            </span>
          ) : (
            <span className="text-xs mono text-gray-400">Progress</span>
          )}
          <span className="text-xs mono font-bold" style={{ color: B }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 mb-8 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${B}, ${BH})` }} />
        </div>

        <div className="space-y-2">
          {steps.map((step, i) => {
            const isDone = done > i, isActive = done === i;
            return (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300"
                style={{
                  background: isDone ? "#f0fdf4" : isActive ? BL : "#fafafa",
                  borderColor: isDone ? "#bbf7d0" : isActive ? `${B}30` : "#f3f4f6",
                  opacity: !isDone && !isActive ? 0.5 : 1,
                }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: isDone ? "#22c55e" : isActive ? B : "#e5e7eb" }}>
                  {isDone
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3.5 h-3.5"><path d="M5 12l5 5L20 7" /></svg>
                    : isActive
                      ? <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      : <span className="text-xs font-bold text-gray-400 mono">{i + 1}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: isDone ? "#166534" : isActive ? "#111827" : "#9ca3af" }}>{step.label}</p>
                </div>
                <span className="text-xs mono font-bold shrink-0"
                  style={{ color: isDone ? "#16a34a" : isActive ? B : "transparent" }}>
                  {isDone ? "Done" : isActive ? "Running…" : "—"}
                </span>
              </div>
            );
          })}
          {isFinalizing && (
            <div className="flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 animate-pulse"
              style={{
                background: BL,
                borderColor: `${B}30`,
              }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: B }}>
                <div className="w-2 h-2 rounded-full bg-white animate-ping" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">Finalizing your report…</p>
                <p className="text-xs text-gray-500">Synthesizing findings across chapters</p>
              </div>
              <span className="text-xs mono font-bold shrink-0 animate-pulse" style={{ color: B }}>
                Finalizing…
              </span>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-8">Typically 2–3 minutes · do not close this tab</p>
      </div>
    </div>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────
// ─── Results ──────────────────────────────────────────────────────────────────
const ASSESSMENT_TYPE_INFO: Record<AssessmentType, { label: string; short: string; long: string; question: string }> = {
  "overall-status": {
    label: "Overall Status",
    short: "Manuscript Condition",
    long: "The overall synthesis evaluates whether the problem, objectives, methodology, findings, and conclusions form an unbroken logical chain suitable for academic submission.",
    question: "What is the actual condition of this manuscript based on the analysis?",
  },
  strength: {
    label: "Key Strength",
    short: "Consistent Alignment",
    long: "Key strengths reflect areas where your manuscript demonstrates consistent logical correspondence across chapters, satisfying standard academic defense criteria.",
    question: "What the manuscript does consistently",
  },
  "major-issue": {
    label: "Major Issue",
    short: "Important Inconsistency",
    long: "Major issues represent substantive inconsistencies across chapters (e.g. unaddressed objectives, unsupported conclusions, or conflicting terminology) that require revision before submission.",
    question: "Most important inconsistencies detected",
  },
  "affected-section": {
    label: "Affected Section",
    short: "Cross-Chapter Conflict",
    long: "Affected sections identify the specific chapter pairs where misalignment or broken conceptual threads were detected.",
    question: "Which chapters/sections are involved",
  },
};

type MobileResultsPane = "findings" | "report" | "xai";

function ResultsScreen({ onNavigate, scan, isSample }: { onNavigate: (s: Screen) => void; scan?: ScanResponse | null; isSample?: boolean }) {
  const [activeId, setActiveIdRaw] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<MobileResultsPane>("report");
  const [filterType, setFilterType] = useState<AssessmentType | "all">("all");
  const [activeTab, setActiveTab] = useState<ActiveResultsTab>('overview');
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>({});
  const [feedbackPending, setFeedbackPending] = useState<Record<string, boolean>>({});
  const [feedbackError, setFeedbackError] = useState<Record<string, string>>({});
  const middlePaneRef = useRef<HTMLDivElement>(null);
  const [manuscriptText, setManuscriptText] = useState<string | null>(null);
  const [manuscriptLoading, setManuscriptLoading] = useState(false);
  const [manuscriptError, setManuscriptError] = useState<string | null>(null);

  const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

  const setActiveId: React.Dispatch<React.SetStateAction<string | null>> = (next) => {
    setActiveIdRaw(prev => {
      const resolved = typeof next === "function" ? (next as (p: string | null) => string | null)(prev) : next;
      if (!isDesktop()) {
        setMobilePane(resolved ? "xai" : "report");
      }
      return resolved;
    });
  };

  useEffect(() => {
    if (!isSample && scan?.analysis_run_id && manuscriptText === null && !manuscriptError) {
      setManuscriptLoading(true);
      setManuscriptError(null);
      fetchManuscript(scan.analysis_run_id)
        .then(res => {
          if (res.available && res.text) setManuscriptText(res.text);
          else if (res.reason === 'private') setManuscriptError("Document is no longer accessible");
          else if (res.reason === 'non_gdocs') setManuscriptError("Preview is only available for Google Docs");
          else setManuscriptError("Manuscript preview unavailable");
        })
        .catch(() => setManuscriptError("Manuscript preview unavailable"))
        .finally(() => setManuscriptLoading(false));
    }
  }, [isSample, scan?.analysis_run_id, manuscriptText, manuscriptError]);

  useEffect(() => {
    middlePaneRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const localItems: AssessmentItem[] = isSample ? ASSESSMENT_ITEMS : [
    ...(scan?.inconsistencies?.map((inc, i) => ({
      id: inc.inconsistency_id || `inc-${i}`,
      type: (inc.finding_status === 'material_issue' ? "major-issue" : "affected-section") as AssessmentType,
      title: (inc.explanation_what ?? "").slice(0, 50) || "Missing section",
      section: `${inc.section_a} ↔ ${inc.section_b}`,
      targetSectionIndex: 0,
      questionOrSubtitle: inc.section_b ? `Conflicts with: ${inc.section_b}` : "Finding",
      description: inc.explanation_why || inc.explanation_what,
      significance: "Requires attention",
      evidence: inc.evidence_a,
      conflictsWith: inc.section_b,
      conflictQuote: inc.evidence_b,
      recommendation: inc.suggested_fix
    })) || []),
    ...(scan?.verifications?.map((v, i) => ({
      id: `ver-${i}`,
      type: "strength" as AssessmentType,
      title: (v.note ?? "").slice(0, 50) || "Verified alignment",
      section: `${v.role_a} ↔ ${v.role_b}`,
      targetSectionIndex: 0,
      questionOrSubtitle: "Verified finding",
      description: v.note ?? "This section pair shows substantive alignment.",
      significance: "Strengthens the manuscript's overall coherence.",
      evidence: "",
      conflictsWith: "",
      conflictQuote: "",
      recommendation: "Preserve this coherent correspondence during panel presentation."
    })) || [])
  ];

  const scanWithRefs = scan as (ScanResponse & { references?: CitedReference[] }) | undefined;
  const rawCitationsList = (scan?.citations && scan.citations.length > 0)
    ? (scan.citations as CitedReference[])
    : (scanWithRefs?.references && scanWithRefs.references.length > 0)
      ? scanWithRefs.references
      : [];

  const localCitations: Citation[] = isSample
    ? CITATIONS
    : rawCitationsList.map((c: CitedReference, i) => {
        let status: Citation["status"] = "neutral";
        const s = c.citation_status || "";
        
        if (["verified_doi", "verified_url", "verified_metadata", "accessible"].includes(s) || c.status === "Accessible") {
          status = "live";
        } else if (["metadata_mismatch", "restricted", "bot_wall"].includes(s)) {
          status = "restricted";
        } else if (["unverified", "unknown_error", "no_link"].includes(s)) {
          status = "neutral";
        } else if (s === "broken" || c.status === "Broken Link") {
          status = "dead";
        } else if (c.citation_is_accessible) {
          status = "live";
        }

        return {
          id: `cit-${i}`,
          ref: c.citation_raw_reference_text || c.citation || "",
          url: c.citation_primary_link || "",
          status,
          title: c.citation_crossref_title,
          authors: c.citation_authors_parsed,
          year: c.citation_year_parsed
        };
      });

  const localParagraphs: typeof PARAGRAPHS = isSample ? PARAGRAPHS : (scan?.inconsistencies ?? []).flatMap((inc, i) => {
     const itemId = inc.inconsistency_id || `inc-${i}`;
     const t = ((inc.coherence_score || 0) < 60 ? "major-issue" : "affected-section") as AssessmentType;
     const p: typeof PARAGRAPHS = [];
     if (inc.section_a) p.push({
       type: "section", chapter: "", heading: inc.section_a, text: inc.evidence_a || inc.explanation_what,
       assessments: [{ itemId, type: t, phrase: inc.evidence_a || inc.explanation_what }]
     });
     if (inc.section_b) p.push({
       type: "section", chapter: "", heading: inc.section_b, text: inc.evidence_b || inc.explanation_why,
       assessments: [{ itemId, type: t, phrase: inc.evidence_b || inc.explanation_why }]
     });
     return p;
  });

  const findingsCount = isSample ? localItems.length : (scan?.inconsistencies?.length ?? 0);
  const sectionsCount = isSample ? localParagraphs.length : (scan?.sections_analyzed?.length ?? 0);

  const score = isSample ? 74 : scan?.overall_coherence_score || 0;
  const dead = localCitations.filter(c => c.status === "dead").length;
  function scrollToSection(sectionIndex: number, itemId?: string) {
    if (itemId) setActiveId(itemId);
    const el = document.getElementById(`sec-${sectionIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function scrollToAssessment() {
    const el = document.getElementById("overall-assessment");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  type STEntry = { hl: string; hlActive: string; pill: string; pillTxt: string; dot: string; border: string; bg: string; accentColor: string; label: string };
  const ST: Record<AssessmentType, STEntry> = {
    "overall-status": {
      hl: "bg-amber-200 rounded px-0.5 cursor-pointer hover:bg-amber-300 transition-colors",
      hlActive: "bg-amber-300 rounded px-0.5 cursor-pointer ring-2 ring-amber-500 ring-offset-1",
      pill: "bg-amber-50 border border-amber-200 text-amber-800",
      pillTxt: "text-amber-800", dot: "bg-amber-500", border: "border-amber-200", bg: "bg-amber-50",
      accentColor: "#d97706", label: "Overall Status",
    },
    strength: {
      hl: "bg-emerald-200 rounded px-0.5 cursor-pointer hover:bg-emerald-300 transition-colors",
      hlActive: "bg-emerald-300 rounded px-0.5 cursor-pointer ring-2 ring-emerald-500 ring-offset-1",
      pill: "bg-emerald-50 border border-emerald-200 text-emerald-800",
      pillTxt: "text-emerald-800", dot: "bg-emerald-500", border: "border-emerald-200", bg: "bg-emerald-50",
      accentColor: "#059669", label: "Key Strength",
    },
    "major-issue": {
      hl: "bg-rose-200 rounded px-0.5 cursor-pointer hover:bg-rose-300 transition-colors",
      hlActive: "bg-rose-300 rounded px-0.5 cursor-pointer ring-2 ring-rose-500 ring-offset-1",
      pill: "bg-rose-50 border border-rose-200 text-rose-800",
      pillTxt: "text-rose-800", dot: "bg-rose-500", border: "border-rose-200", bg: "bg-rose-50",
      accentColor: "#e11d48", label: "Major Issue",
    },
    "affected-section": {
      hl: "bg-blue-200 rounded px-0.5 cursor-pointer hover:bg-blue-300 transition-colors",
      hlActive: "bg-blue-300 rounded px-0.5 cursor-pointer ring-2 ring-blue-500 ring-offset-1",
      pill: "bg-blue-50 border border-blue-200 text-blue-800",
      pillTxt: "text-blue-800", dot: "bg-blue-500", border: "border-blue-200", bg: "bg-blue-50",
      accentColor: "#2563eb", label: "Affected Section",
    },
  };

  const filteredItems = filterType === "all" ? localItems : localItems.filter(i => i.type === filterType);
  const activeItem = activeId ? localItems.find(i => i.id === activeId) ?? null : null;
  const itemIdx = activeItem ? localItems.findIndex(i => i.id === activeItem.id) : -1;

  function renderPara(para: typeof localParagraphs[0]) {
    if (!para.assessments.length) return <>{para.text}</>;
    let txt = para.text;
    const parts: React.ReactNode[] = [];
    para.assessments.forEach(({ phrase, type, itemId }) => {
      const idx = txt.indexOf(phrase);
      if (idx === -1) return;
      const isActive = activeId === itemId;
      parts.push(txt.slice(0, idx));
      parts.push(
        <mark key={itemId + phrase}
          className={isActive ? ST[type].hlActive : ST[type].hl}
          style={{ textDecoration: "none" }}
          onClick={() => setActiveId(prev => prev === itemId ? null : itemId)}>
          {phrase}
        </mark>
      );
      txt = txt.slice(idx + phrase.length);
    });
    parts.push(txt);
    return <>{parts}</>;
  }

  // ── Tab data ──
  const inconsistencyItems = localItems.filter(i => i.type === "major-issue" || i.type === "affected-section");
  const visibleInconsistencies =
    filterType === "major-issue" || filterType === "affected-section"
      ? inconsistencyItems.filter(i => i.type === filterType)
      : inconsistencyItems;
  const inconsistenciesCount = inconsistencyItems.length;

  type EnrichedPair = RolePairScore & {
    verification?: { alignment: string; note: string };
  };

  const verificationByPair = new Map(
    (scan?.verifications ?? []).map(v => [`${v.role_a}|${v.role_b}`, v] as const)
  );
  const allPairs: EnrichedPair[] = (
    isSample
      ? (SAMPLE_PAIRS as EnrichedPair[])
      : ((scan?.score_breakdown?.coherence_detail?.pair_scores ?? []) as RolePairScore[]).filter(p => p.included)
  )
    .map(p => ({ ...p, verification: isSample ? undefined : verificationByPair.get(`${p.role_a}|${p.role_b}`) }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const visiblePairs: EnrichedPair[] = filterType === "strength" ? allPairs.filter(p => (p.score ?? 0) >= PAR_SCORE) : allPairs;
  const pairsCount = allPairs.length;

  const citationsCount = localCitations.length;
  const citeCount = (s: Citation["status"]) => localCitations.filter(c => c.status === s).length;

  const aiText: AITextIndicator | null = isSample ? SAMPLE_AI_TEXT : (scan?.ai_text_indicator ?? null);

  const tabList: Array<{ id: ActiveResultsTab; label: string }> = [
    { id: 'overview',         label: 'Overview' },
    { id: 'inconsistencies',  label: `Inconsistencies (${inconsistenciesCount})` },
    { id: 'strong_coherence', label: `Coherence Pairs (${pairsCount})` },
    { id: 'citations',        label: `Citations (${citationsCount})` },
    { id: 'originality',      label: 'Writing Style' },
  ];

  // Feedback is only valid for inconsistency findings that exist in the DB.
  // Strengths ("ver-N") and the sample overall-status card are excluded.
  const canGiveFeedback = (it: AssessmentItem | null): it is AssessmentItem =>
    !!it &&
    (it.type === "major-issue" || it.type === "affected-section") &&
    (isSample || !!scan?.inconsistencies?.some(i => i.inconsistency_id === it.id));

  async function handleFeedback(item: AssessmentItem, helpful: boolean) {
    if (feedbackMap[item.id] || feedbackPending[item.id]) return;          // one vote per finding
    if (!canGiveFeedback(item)) return;
    if (isSample) {                                                         // sample: local only, no network
      setFeedbackMap(p => ({ ...p, [item.id]: helpful ? 'up' : 'down' }));
      return;
    }
    const userId = scan?.user_id;
    if (!userId) return;

    setFeedbackPending(p => ({ ...p, [item.id]: true }));
    setFeedbackError(p => { const n = { ...p }; delete n[item.id]; return n; });
    try {
      const res = await fetch(`${API_BASE_URL}/api/issues/${encodeURIComponent(item.id)}/feedback`, {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json', 'X-User-Id': userId }),
        body: JSON.stringify({ helpful }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);                   // fetch does not throw on 4xx/5xx
      setFeedbackMap(p => ({ ...p, [item.id]: helpful ? 'up' : 'down' }));
    } catch (err) {
      console.error('Failed to submit issue feedback:', err);
      setFeedbackError(p => ({ ...p, [item.id]: 'Could not save feedback. Please try again.' }));
    } finally {
      setFeedbackPending(p => ({ ...p, [item.id]: false }));
    }
  }

  // Single feedback widget used by BOTH the Inconsistencies cards and the right-pane XAI card.
  function renderFeedback(item: AssessmentItem) {
    if (!canGiveFeedback(item)) return null;
    const vote = feedbackMap[item.id];
    const locked = !!vote || !!feedbackPending[item.id];
    const btn = (kind: 'up' | 'down', helpful: boolean, icon: React.ReactNode, label: string, activeCls: string) => (
      <button
        type="button"
        disabled={locked}
        title={label}
        onClick={e => { e.stopPropagation(); handleFeedback(item, helpful); }}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
          vote === kind ? activeCls : 'bg-white border-gray-200 text-gray-600'
        } ${locked ? `cursor-not-allowed ${vote === kind ? '' : 'opacity-40'}` : 'cursor-pointer hover:bg-gray-50 hover:border-gray-300'}`}>
        <span>{icon}</span><span>{label}</span>
      </button>
    );
    const thumbUpIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
        <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
      </svg>
    );
    const thumbDownIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
        <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h3a2 2 0 012 2v7a2 2 0 01-2 2h-3" />
      </svg>
    );
    return (
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap" onClick={e => e.stopPropagation()}>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Was this finding helpful?</span>
          {vote && <span className="text-[11px] text-emerald-700">Thanks — feedback recorded.</span>}
          {feedbackError[item.id] && <span className="text-[11px] text-rose-600">{feedbackError[item.id]}</span>}
        </div>
        <div className="flex items-center gap-2">
          {btn('up', true, thumbUpIcon, 'Helpful', 'bg-emerald-50 border-emerald-300 text-emerald-700')}
          {btn('down', false, thumbDownIcon, 'Not helpful', 'bg-rose-50 border-rose-300 text-rose-700')}
        </div>
      </div>
    );
  }

  function applyFilter(next: AssessmentType | "all") {
    setFilterType(next);
    if (next === "major-issue" || next === "affected-section") setActiveTab("inconsistencies");
    else if (next === "strength") setActiveTab("strong_coherence");
    else if (next === "overall-status") setActiveTab("overview");
    else if (activeTab === "citations" || activeTab === "originality") setActiveTab("inconsistencies"); // "all"
  }

  return (
    <div className="h-screen h-dvh flex flex-col overflow-hidden bg-gray-50">

      {/* ── Navbar ── */}
      <nav className="shrink-0 bg-white border-b border-gray-100 z-50">
        <div className="px-5 h-12 flex items-center gap-3">
          <button onClick={() => onNavigate("home")} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 font-medium transition-colors shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>Home
          </button>
          <div className="h-4 w-px bg-gray-200 shrink-0" />
          <Logo className="h-6 w-auto shrink-0" />
          <span className="text-xs text-gray-400 truncate hidden md:block">
            {isSample ? "/ Predictors of Academic Burnout Among STEM Undergraduates" : "/ Document Coherence Scan"}
          </span>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {!isSample && (
              <>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200 transition-all cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>Export PDF
                </button>
                <button onClick={() => onNavigate("upload")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer" style={{ background: B }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M12 5v14M5 12h14" /></svg>New Scan
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── 3-column body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ══ LEFT: sidebar — score + assessment findings list ══ */}
        <div className={`${mobilePane === "findings" ? "flex w-full" : "hidden"} print:flex lg:flex lg:w-72 xl:w-80 shrink-0 border-r border-gray-100 bg-white flex-col overflow-y-auto`}>
          {/* Score ring */}
          <div className="px-5 pt-6 pb-4 border-b border-gray-100 flex flex-col items-center gap-2.5">
            <ScoreRing score={score} size={88} />
            <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">Coherence Score</p>
            <div className="w-full mt-1.5 space-y-1">
              {(["overall-status", "strength", "major-issue", "affected-section"] as AssessmentType[])
                .filter(t => isSample || t !== "overall-status")
                .map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => applyFilter(filterType === t ? "all" : t)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${filterType === t ? "bg-gray-100" : "hover:bg-gray-50"}`}>
                  <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${ST[t].dot}`} />
                  <span className="text-xs font-medium text-gray-700 flex-1">{ST[t].label}</span>
                  <span className={`text-xs font-black ${ST[t].pillTxt}`}>
                    {isSample ? localItems.filter(i => i.type === t).length : (
                      t === 'strength' ? (scan?.verifications?.length ?? 0) :
                      t === 'major-issue' ? (scan?.inconsistencies?.filter(i => i.finding_status === 'material_issue').length ?? 0) :
                      new Set(scan?.inconsistencies?.map(i => i.section_a)).size
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Assessment Filter Bar */}
          <div className="px-4 pt-3.5 pb-2.5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2 px-0.5">
              <span className="text-xs mono font-bold uppercase tracking-wider text-gray-500">Assessment</span>
              {filterType !== "all" && (
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">
                  Show all ({localItems.length})
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => applyFilter("all")}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${filterType === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                All ({localItems.length})
              </button>
              <button
                type="button"
                onClick={() => applyFilter("strength")}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${filterType === "strength" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}>
                Strengths ({isSample ? 3 : (scan?.verifications?.length ?? 0)})
              </button>
              <button
                type="button"
                onClick={() => applyFilter("major-issue")}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${filterType === "major-issue" ? "bg-rose-700 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}>
                Major Issues ({isSample ? 3 : (scan?.inconsistencies?.filter(i => i.finding_status === 'material_issue').length ?? 0)})
              </button>
              <button
                type="button"
                onClick={() => applyFilter("affected-section")}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${filterType === "affected-section" ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}>
                Affected ({isSample ? 3 : new Set(scan?.inconsistencies?.map(i => i.section_a)).size})
              </button>
            </div>
          </div>

          {/* Assessment Items list */}
          <div className="px-3.5 py-3 flex-1 space-y-1.5">
            {filteredItems.map((item, idx) => (
              <button key={item.id}
                onClick={() => {
                  setActiveId(prev => prev === item.id ? null : item.id);
                  if (activeTab === 'overview') scrollToSection(item.targetSectionIndex);
                  else if (activeTab === 'citations' || activeTab === 'originality')
                    setActiveTab(item.type === 'strength' ? 'strong_coherence' : 'inconsistencies');
                }}
                className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left border transition-all cursor-pointer ${activeId === item.id ? `${ST[item.type].bg} ${ST[item.type].border} shadow-xs` : "border-transparent hover:bg-gray-50"
                  }`}>
                <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${ST[item.type].dot}`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-[11px] font-bold uppercase tracking-wider block ${ST[item.type].pillTxt}`}>{ST[item.type].label}</span>
                  <span className="text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2 mt-0.5">{item.title}</span>
                  <span className="text-xs text-gray-500 leading-tight truncate block mt-1">{item.section}</span>
                </div>
                <span className="text-xs mono font-bold text-gray-400 shrink-0 mt-0.5">#{idx + 1}</span>
              </button>
            ))}
          </div>

          {/* Highlight legend */}
          <div className="px-4 py-3.5 border-t border-gray-100 space-y-2">
            <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500 mb-1">Highlight key</p>
            <div className="flex flex-wrap gap-1.5">
              {(["overall-status", "strength", "major-issue", "affected-section"] as AssessmentType[]).map(t => (
                <span key={t} className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${ST[t].hl.split(" ").filter(c => c.startsWith("bg-")).join(" ")} ${ST[t].pillTxt}`}>
                  {ST[t].label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ══ CENTER: tab bar + tab content ══ */}
        <div ref={middlePaneRef} className={`${mobilePane === "report" ? "flex" : "hidden"} print:flex lg:flex flex-1 min-w-0 overflow-y-auto bg-gray-100 flex-col`}>
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 lg:px-10 flex items-center gap-1 overflow-x-auto shadow-2xs shrink-0">
            {tabList.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3.5 text-xs font-bold border-b-2 -mb-px transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-6 lg:px-10 py-8 flex-1">
            {activeTab === 'overview' && (<>

            {/* Document header */}
            <div className="bg-white rounded-2xl border border-gray-200 px-10 pt-10 pb-8 mb-6 shadow-sm">
              {isSample && (
                <p className="text-[10px] mono font-bold uppercase tracking-widest mb-3" style={{ color: B }}>
                  Sample Manuscript Report
                </p>
              )}
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-snug mb-2">
                {isSample ? "Predictors of Academic Burnout Among STEM Undergraduates in Philippine Universities" : "Document Coherence Scan"}
              </h1>
              {isSample && (
                <p className="text-sm text-gray-500 mb-5">A descriptive-correlational study • Academic Year 2023–2024</p>
              )}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100 flex-wrap">
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">Scan complete</span>
                <span className="text-[11px] text-gray-500 font-medium">Overall Assessment: <strong className={isSample ? "text-amber-700" : "text-gray-900"}>{isSample ? "Moderate Coherence" : (scan?.score_breakdown?.band || "Pending")}</strong></span>
                <span className="text-[11px] text-gray-300">•</span>
                <span className="text-[11px] text-gray-400">{findingsCount} findings across {sectionsCount} sections</span>
                <span className="text-[11px] text-gray-300">•</span>
                <span className="text-[11px] text-gray-400">Click any highlight to see Assessment Details</span>
              </div>
            </div>

            {/* ══ OVERALL ASSESSMENT EXECUTIVE CARD ══ */}
            <div id="overall-assessment" className="scroll-mt-14 bg-white rounded-2xl border border-gray-200 p-8 mb-6 shadow-xs">

              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full text-indigo-700 bg-indigo-50 border border-indigo-100">
                      Overall Assessment
                    </span>
                    <span className="text-xs text-gray-400">· Executive Synthesis</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Overall Manuscript Assessment</h2>
                  <p className="text-xs text-gray-500 italic mt-1 font-serif">
                    “{OVERALL_ASSESSMENT.question}”
                  </p>
                </div>

                {/* Overall Status Badge */}
                <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                  <span className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400">Overall Status</span>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-200 bg-amber-50">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-black text-amber-800 tracking-wide uppercase">
                      {isSample ? OVERALL_ASSESSMENT.status : (scan?.score_breakdown?.band || "Pending")}
                    </span>
                  </div>
                  {isSample && (
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <span>Scale:</span>
                      <span className="text-gray-400">High</span>
                      <span>•</span>
                      <span className="font-bold text-amber-700 underline">Moderate</span>
                      <span>•</span>
                      <span className="text-gray-400">Low</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Overall Status Condition Summary */}
              <div className="py-5 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-2.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-indigo-600">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                  </svg>
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    Overall Status Condition
                  </span>
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                    {isSample ? OVERALL_ASSESSMENT.status : (scan?.score_breakdown?.band || "Pending")}
                  </span>
                </div>
                <div className="bg-amber-50/40 rounded-xl p-4 sm:p-5 border border-amber-100/80">
                  <p className="text-sm text-gray-700 leading-relaxed font-normal">
                    {isSample 
                      ? OVERALL_ASSESSMENT.statusDescription 
                      : (scan?.score_breakdown?.biggest_lever?.reason || "To be developed")}
                  </p>
                </div>
              </div>

              {/* 2-Column Grid: Key Strengths & Major Issues */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-5 border-b border-gray-100">
                {/* Key Strengths */}
                <div className="bg-emerald-50/40 rounded-xl p-5 border border-emerald-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M20 6L9 17l-5-5" /></svg>
                        </div>
                        <h3 className="text-sm font-bold text-emerald-950">Key Strengths</h3>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        {isSample ? OVERALL_ASSESSMENT.strengths.length : (scan?.verifications?.length ?? 0)} Verified
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700/80 italic mb-3">What the manuscript does consistently</p>
                    {isSample ? (
                      <ul className="space-y-2.5">
                        {OVERALL_ASSESSMENT.strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      (scan?.verifications && scan.verifications.length > 0) ? (
                        <ul className="space-y-2.5">
                          {scan.verifications.map((v, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                              <span><strong className="text-emerald-900">{v.role_a} ↔ {v.role_b}:</strong> {v.note || "Aligned"}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No verified strengths detected.</p>
                      )
                    )}
                  </div>
                </div>

                {/* Major Issues */}
                <div className="bg-rose-50/40 rounded-xl p-5 border border-rose-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-sm font-bold text-rose-950">Major Issues</h3>
                      </div>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full">
                        {isSample ? OVERALL_ASSESSMENT.majorIssues.length : (scan?.inconsistencies?.filter(i => i.finding_status === 'material_issue').length ?? 0)} Detected
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-700/80 italic mb-3">Most important inconsistencies detected</p>
                    {isSample ? (
                      <ul className="space-y-2.5">
                        {OVERALL_ASSESSMENT.majorIssues.map((iss, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                            <span>{iss}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      (scan?.inconsistencies && scan.inconsistencies.filter(i => i.finding_status === 'material_issue').length > 0) ? (
                        <ul className="space-y-2.5">
                          {(() => {
                            const allMaterial = scan.inconsistencies.filter(i => i.finding_status === 'material_issue');
                            const isMissingSection = (i: typeof allMaterial[0]) => !i.section_b || i.coherence_score == null;
                            const missingSecs = allMaterial.filter(isMissingSection);
                            const regularIssues = allMaterial.filter(i => !isMissingSection(i));
                            return (
                              <>
                                {missingSecs.length > 0 && (
                                  <li className="flex items-start gap-2.5 text-xs text-rose-900 leading-snug bg-rose-100/70 p-3 rounded-xl border border-rose-200">
                                    <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 mt-1" />
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-rose-950 uppercase text-[10px] tracking-wider">Missing Required Sections ({missingSecs.length})</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">Completeness Alert</span>
                                      </div>
                                      <p className="text-xs text-rose-900 font-semibold">
                                        {missingSecs.map(i => formatRoleLabel(i.section_a)).join(" · ")}
                                      </p>
                                      <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                                        Required academic sections are absent from this draft. Add these sections to satisfy standard thesis submission requirements.
                                      </p>
                                    </div>
                                  </li>
                                )}
                                {regularIssues.map((iss, idx) => (
                                  <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                                    <span><strong className="text-rose-900">{iss.section_a} ↔ {iss.section_b}:</strong> {iss.explanation_what}</span>
                                  </li>
                                ))}
                              </>
                            );
                          })()}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No major issues detected.</p>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Affected Sections */}
              <div className="pt-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4" /></svg>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">Affected Sections</h3>
                  </div>
                  <span className="text-[11px] text-gray-500 italic">Which chapters/sections are involved</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  {isSample ? (
                    OVERALL_ASSESSMENT.affectedSections.map((sec, idx) => (
                      <button
                        key={idx}
                        onClick={() => scrollToSection(sec.targetSectionIndex, sec.itemId)}
                        className="group flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all text-left cursor-pointer"
                      >
                        <div>
                          <span className="text-xs font-bold text-gray-800 group-hover:text-blue-600 transition-colors block">
                            {sec.label}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5 block">
                            Click to inspect cross-section conflict
                          </span>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-0.5 shrink-0">
                          <path d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))
                  ) : (
                    Array.from(new Set(scan?.inconsistencies?.map(i => i.section_a).filter(Boolean) || [])).map((secName, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-gray-50 text-left"
                      >
                        <div>
                          <span className="text-xs font-bold text-gray-800 block">
                            {secName}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5 block">
                            Inconsistencies detected in this section
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Highlight legend — compact inline */}
            <div className="flex items-center gap-2 px-1 mb-5 flex-wrap">
              <span className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400 mr-1">Highlights:</span>
              {(["overall-status", "strength", "major-issue", "affected-section"] as AssessmentType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => applyFilter(filterType === t ? "all" : t)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${filterType === t ? `${ST[t].bg} ${ST[t].border} ring-2 ring-indigo-400` : ST[t].pill}`}>
                  <span className={`w-2 h-2 rounded-sm inline-block ${ST[t].dot}`} />
                  {ST[t].label} ({localItems.filter(i => i.type === t).length})
                </button>
              ))}
            </div>

            {/* Document body — continuous paper */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {localParagraphs.map((para, i) => {
                const hasActive = para.assessments.some(pi => pi.itemId === activeId);
                const activeType = para.assessments.find(pi => pi.itemId === activeId)?.type;
                const isChapterHead = para.type === "chapter-heading";
                return (
                  <div key={i}
                    id={`sec-${i}`}
                    className={`scroll-mt-14 transition-colors duration-200 ${hasActive && activeType ? "" : ""}`}
                    style={{ background: hasActive && activeType ? `${ST[activeType].accentColor}05` : undefined }}>

                    {/* Divider between entries */}
                    {i > 0 && <div className={`mx-8 lg:mx-12 border-t ${isChapterHead ? "border-gray-200 my-0" : "border-gray-100 my-0"}`} />}

                    <div className={`px-8 lg:px-12 ${isChapterHead ? "pt-10 pb-0" : "pt-6 pb-0"}`}>

                      {/* Chapter label for chapter headings */}
                      {isChapterHead && (
                        <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: B }}>{para.chapter}</p>
                      )}

                      {/* Section heading row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h2 className={`font-bold tracking-tight text-gray-900 leading-snug ${isChapterHead ? "text-xl" : "text-base"}`}>
                          {para.heading}
                        </h2>
                        {/* Assessment badges inline with heading */}
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5 flex-wrap justify-end">
                          {para.assessments.length === 0
                            ? <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Aligned</span>
                            : [...new Map(para.assessments.map(pi => [pi.itemId, pi])).values()].map(pi => (
                              <button key={pi.itemId}
                                onClick={() => setActiveId(prev => prev === pi.itemId ? null : pi.itemId)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${activeId === pi.itemId ? `${ST[pi.type].bg} ${ST[pi.type].border} scale-105` : ST[pi.type].pill}`}>
                                {ST[pi.type].label}
                              </button>
                            ))
                          }
                        </div>
                      </div>

                      {/* Paragraph text */}
                      <p className={`text-gray-700 leading-relaxed pb-8 ${isChapterHead ? "text-[16px]" : "text-[15px]"}`}
                        style={{ lineHeight: "1.85" }}>
                        {renderPara(para)}
                      </p>

                    </div>
                  </div>
                );
              })}

              {/* References — inside the document paper */}
              <div className="mx-8 lg:mx-12 border-t border-gray-200 mt-0" />
              <div className="px-8 lg:px-12 pt-8 pb-10" id="refs">
                <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1 text-gray-400">References</p>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-xl font-bold text-gray-900">Bibliography</h2>
                  <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{localCitations.length} sources checked</span>
                  {dead > 0 && <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{dead} inaccessible</span>}
                </div>
                {dead > 0 && (
                  <div className="flex items-start gap-3 px-4 py-3 mb-4 rounded-xl border border-red-200 bg-red-50">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-500 shrink-0 mt-0.5"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                    <p className="text-xs text-red-700 leading-relaxed"><span className="font-bold">{dead} reference URL{dead > 1 ? "s" : ""}</span> could not be reached. Try opening them in a browser — if broken, update to a working DOI before submission.</p>
                  </div>
                )}
                {localCitations.length > 0 ? (
                  <div className="space-y-2">
                    {localCitations.map((cite, ci) => (
                      <div key={cite.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors ${
                        cite.status === "live" ? "border-gray-100 bg-gray-50 hover:bg-gray-100" 
                        : cite.status === "restricted" ? "border-amber-100 bg-amber-50"
                        : cite.status === "neutral" ? "border-slate-200 bg-slate-50"
                        : "border-red-100 bg-red-50"
                      }`}>
                        <span className="text-[11px] mono font-bold text-gray-300 mt-0.5 w-4 shrink-0">{ci + 1}</span>
                        <div className="flex-1 min-w-0">
                          {cite.title && <p className="text-sm font-bold text-gray-900 mb-0.5 leading-snug">{cite.title}</p>}
                          <p className="text-[13px] text-gray-800 leading-snug">
                            {cite.authors && <span className="font-medium mr-1">{cite.authors}.</span>}
                            {cite.year && <span className="text-gray-500 mr-1">({cite.year}).</span>}
                            {cite.ref}
                          </p>
                          {cite.url && (
                             <p className={`text-[11px] mono truncate mt-1 ${
                               cite.status === "live" ? "text-gray-400" 
                               : cite.status === "restricted" ? "text-amber-600" 
                               : cite.status === "neutral" ? "text-slate-400"
                               : "text-red-500"
                             }`}>{cite.url}</p>
                          )}
                        </div>
                        
                        {/* Status Badge */}
                        <div className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          cite.status === "live" ? "bg-emerald-100 text-emerald-700"
                          : cite.status === "restricted" ? "bg-amber-100 text-amber-700"
                          : cite.status === "neutral" ? "bg-slate-200 text-slate-700" 
                          : "bg-red-100 text-red-700"
                        }`}>
                          {cite.status === "live" ? (
                             <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M5 12l5 5L20 7" /></svg>Live</>
                          ) : cite.status === "restricted" ? (
                             <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>Restricted</>
                          ) : cite.status === "neutral" ? (
                             <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>Neutral</>
                          ) : (
                             <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M18 6L6 18M6 6l12 12" /></svg>Dead link</>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 italic">
                    No citations were detected in this manuscript ({scan?.citations_audited ?? 0} sources audited).
                  </div>
                )}
              </div>
            </div>{/* end document paper */}

            {/* ══ R3: INLINE MANUSCRIPT WITH SECTION HIGHLIGHTS (Ported from ResultDetails.tsx:626-950) ══ */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10 shadow-xs space-y-8 font-sans leading-relaxed text-gray-800 mt-8">
              <div className="flex items-center justify-between border-b border-gray-100 pb-5 flex-wrap gap-3">
                <div>
                  <span className="text-[10px] mono font-bold uppercase tracking-widest text-indigo-600 block">
                    Inline Manuscript Inspection
                  </span>
                  <h2 className="font-serif text-2xl font-bold text-gray-900 mt-1">
                    Continuous Manuscript with Section Highlights
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click any highlighted passage to inspect findings and recommendations in the right Explainable AI panel.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                    Major Issue
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Key Strength
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    Affected Section
                  </span>
                </div>
              </div>

              {/* R3 Renderer: Real fetched text vs sample chapters */}
              {!isSample ? (
                manuscriptLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-sm font-bold text-gray-700">Loading manuscript text...</p>
                  </div>
                ) : manuscriptText ? (
                  <div className="whitespace-pre-wrap text-sm sm:text-base text-gray-800 leading-relaxed font-serif">
                    {(() => {
                      if (!scan?.inconsistencies?.length) return manuscriptText;
                      interface PhraseMatch { phrase: string; itemId: string; type: AssessmentType; index: number; }
                      const matches: PhraseMatch[] = [];
                      scan.inconsistencies.forEach(inc => {
                        const itemId = inc.inconsistency_id || "";
                        const t = (inc.finding_status === 'material_issue' ? "major-issue" : "affected-section") as AssessmentType;
                        if (inc.evidence_a && inc.evidence_a.trim().length > 10) {
                          const idx = manuscriptText.indexOf(inc.evidence_a);
                          if (idx !== -1) matches.push({ phrase: inc.evidence_a, itemId, type: t, index: idx });
                        }
                        if (inc.evidence_b && inc.evidence_b.trim().length > 10) {
                          const idx = manuscriptText.indexOf(inc.evidence_b);
                          if (idx !== -1) matches.push({ phrase: inc.evidence_b, itemId, type: t, index: idx });
                        }
                      });
                      if (matches.length === 0) return manuscriptText;
                      matches.sort((a, b) => a.index - b.index);
                      const nonOverlapping: PhraseMatch[] = [];
                      let lastEnd = 0;
                      for (const m of matches) {
                        if (m.index >= lastEnd) {
                          nonOverlapping.push(m);
                          lastEnd = m.index + m.phrase.length;
                        }
                      }
                      const nodes: React.ReactNode[] = [];
                      let cursor = 0;
                      nonOverlapping.forEach((m, idx) => {
                        if (m.index > cursor) nodes.push(manuscriptText.slice(cursor, m.index));
                        const isActive = activeId === m.itemId;
                        nodes.push(
                          <mark
                            key={`${m.itemId}-${idx}`}
                            onClick={() => setActiveId(prev => prev === m.itemId ? null : m.itemId)}
                            className={`font-semibold px-1 py-0.5 rounded cursor-pointer transition-all ${
                              isActive ? ST[m.type].hlActive : ST[m.type].hl
                            }`}
                            style={{ textDecoration: "none" }}
                          >
                            {m.phrase}
                          </mark>
                        );
                        cursor = m.index + m.phrase.length;
                      });
                      if (cursor < manuscriptText.length) nodes.push(manuscriptText.slice(cursor));
                      return nodes;
                    })()}
                  </div>
                ) : (
                  /* Fallback to parsed section paragraphs when GDocs preview is unavailable */
                  <div className="space-y-6">
                    {manuscriptError && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                        {manuscriptError} — displaying parsed manuscript section excerpts below.
                      </p>
                    )}
                    {localParagraphs.map((para, i) => (
                      <div key={i} className="border-b border-gray-100 pb-5 space-y-2">
                        <h3 className="font-serif font-bold text-base text-gray-900">{para.heading}</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">{renderPara(para)}</p>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Sample Manuscript content (adapted from ResultDetails.tsx:630-934) */
                <div className="space-y-8">
                  {/* CHAPTER 1 */}
                  <section id="inline-chapter-1" className="space-y-4 border-b border-gray-100 pb-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] mono uppercase tracking-widest text-indigo-600 font-bold block">
                          CHAPTER 1
                        </span>
                        <h3 className="font-serif text-xl font-bold text-gray-900 mt-0.5">
                          Introduction
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        Major Issue
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                      Academic burnout has emerged as a significant psychological concern among university students worldwide, with particular severity observed in science, technology, engineering, and mathematics (STEM) programs. This study investigates the predictors of academic burnout among{' '}
                      <mark
                        onClick={() => setActiveId(prev => prev === 'a7' ? null : 'a7')}
                        className={`font-semibold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                          activeId === 'a7' ? 'bg-rose-200 text-rose-950 ring-2 ring-rose-500 font-bold shadow-xs' : 'bg-rose-50 text-rose-800 border-b-2 border-rose-300 hover:bg-rose-100'
                        }`}
                      >
                        STEM undergraduates across Philippine universities, covering both rural and urban settings.
                      </mark>
                      {' '}The increasing competitive pressure, rigorous coursework, and limited psychosocial support structures in Philippine higher education create conditions that are especially conducive to burnout progression.
                    </p>

                    <div className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif font-bold text-base text-gray-900">
                          Objectives of the Study
                        </h4>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Major Issue
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        This study specifically aims to: (1) identify the prevalence of academic burnout among STEM students; (2) determine burnout predictors among students in{' '}
                        <mark
                          onClick={() => setActiveId(prev => prev === 'a7' ? null : 'a7')}
                          className={`font-semibold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                            activeId === 'a7' ? 'bg-rose-200 text-rose-950 ring-2 ring-rose-500 font-bold shadow-xs' : 'bg-rose-50 text-rose-800 border-b-2 border-rose-300 hover:bg-rose-100'
                          }`}
                        >
                          urban barangays in Metro Manila only;
                        </mark>
                        {' '}and (3) assess the moderating role of peer support on burnout levels among the identified population.
                      </p>
                    </div>

                    <div className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif font-bold text-base text-gray-900">
                          Statement of the Problem
                        </h4>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Affected Section
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Despite growing awareness of mental health issues in tertiary education, few empirical studies have examined the specific predictors of burnout within Philippine STEM contexts. The study will{' '}
                        <mark
                          onClick={() => setActiveId(prev => prev === 'a8' ? null : 'a8')}
                          className={`font-semibold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                            activeId === 'a8' ? 'bg-blue-200 text-blue-950 ring-2 ring-blue-500 font-bold shadow-xs' : 'bg-blue-50 text-blue-800 border-b-2 border-blue-300 hover:bg-blue-100'
                          }`}
                        >
                          measure student engagement using biometric data
                        </mark>
                        {' '}collected over one semester to answer three research questions: (1) What is the current burnout level among STEM undergraduates? (2) Which academic and environmental factors best predict burnout? (3) Does peer support moderate the relationship between workload and burnout?
                      </p>
                    </div>
                  </section>

                  {/* CHAPTER 2 */}
                  <section id="inline-chapter-2" className="space-y-4 border-b border-gray-100 pb-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] mono uppercase tracking-widest text-indigo-600 font-bold block">
                          CHAPTER 2
                        </span>
                        <h3 className="font-serif text-xl font-bold text-gray-900 mt-0.5">
                          Review of Related Literature
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        Major Issue
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                      <mark
                        onClick={() => setActiveId(prev => prev === 'a7' ? null : 'a7')}
                        className={`font-semibold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                          activeId === 'a7' ? 'bg-rose-200 text-rose-950 ring-2 ring-rose-500 font-bold shadow-xs' : 'bg-rose-50 text-rose-800 border-b-2 border-rose-300 hover:bg-rose-100'
                        }`}
                      >
                        Technology acceptance, defined as the degree to which an individual believes that using a particular system would enhance their performance,
                      </mark>
                      {' '}is central to understanding digital tool adoption in education. Several frameworks build on this foundational concept, establishing baseline metrics for technological adaptation.
                    </p>

                    <div className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif font-bold text-base text-gray-900">
                          Conceptual Framework
                        </h4>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Major Issue
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        <mark
                          onClick={() => setActiveId(prev => prev === 'a7' ? null : 'a7')}
                          className={`font-semibold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                            activeId === 'a7' ? 'bg-rose-200 text-rose-950 ring-2 ring-rose-500 font-bold shadow-xs' : 'bg-rose-50 text-rose-800 border-b-2 border-rose-300 hover:bg-rose-100'
                          }`}
                        >
                          Technology acceptance, defined as the degree to which an individual believes that using a particular system would enhance their performance,
                        </mark>
                        {' '}serves as the theoretical anchor for this study's digital-tool adoption model. Building on this definition, the framework positions perceived usefulness and perceived ease of use as mediating variables between environmental stressors and burnout outcomes.
                      </p>
                    </div>
                  </section>

                  {/* CHAPTER 3 */}
                  <section id="inline-chapter-3" className="space-y-4 border-b border-gray-100 pb-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] mono uppercase tracking-widest text-indigo-600 font-bold block">
                          CHAPTER 3
                        </span>
                        <h3 className="font-serif text-xl font-bold text-gray-900 mt-0.5">
                          Methodology
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Affected Section
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                      A descriptive-correlational research design was employed to examine the relationship between academic workload, peer support, and burnout among university students. Data were collected using the{' '}
                      <mark
                        onClick={() => setActiveId(prev => prev === 'a8' ? null : 'a8')}
                        className={`font-semibold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                          activeId === 'a8' ? 'bg-blue-200 text-blue-950 ring-2 ring-blue-500 font-bold shadow-xs' : 'bg-blue-50 text-blue-800 border-b-2 border-blue-300 hover:bg-blue-100'
                        }`}
                      >
                        Maslach Burnout Inventory–Student Survey (MBI-SS) and the Academic Workload Scale (AWS).
                      </mark>
                      {' '}The research instruments were administered via an online survey platform during the second semester of Academic Year 2023–2024. A total of{' '}
                      <mark
                        onClick={() => setActiveId(prev => prev === 'a9' ? null : 'a9')}
                        className={`font-semibold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                          activeId === 'a9' ? 'bg-blue-200 text-blue-950 ring-2 ring-blue-500 font-bold shadow-xs' : 'bg-blue-50 text-blue-800 border-b-2 border-blue-300 hover:bg-blue-100'
                        }`}
                      >
                        120 respondents
                      </mark>
                      {' '}were recruited through stratified random sampling across four Metro Manila universities, with quotas set per year level and degree program.
                    </p>
                  </section>

                  {/* CHAPTER 4 */}
                  <section id="inline-chapter-4" className="space-y-4 border-b border-gray-100 pb-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] mono uppercase tracking-widest text-indigo-600 font-bold block">
                          CHAPTER 4
                        </span>
                        <h3 className="font-serif text-xl font-bold text-gray-900 mt-0.5">
                          Results and Discussion
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        Major Issue
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                      A total of{' '}
                      <mark
                        onClick={() => setActiveId(prev => prev === 'a9' ? null : 'a9')}
                        className={`font-semibold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                          activeId === 'a9' ? 'bg-blue-200 text-blue-950 ring-2 ring-blue-500 font-bold shadow-xs' : 'bg-blue-50 text-blue-800 border-b-2 border-blue-300 hover:bg-blue-100'
                        }`}
                      >
                        108 respondents submitted complete responses
                      </mark>
                      {' '}after data cleaning and exclusion of incomplete forms. Descriptive statistics revealed that 61% of respondents scored in the high burnout range on the MBI-SS emotional exhaustion subscale. Pearson correlation analysis showed a significant positive relationship between workload and burnout (r=0.61, p&lt;0.001), indicating that heavier perceived workloads are strongly associated with higher burnout levels.{' '}
                      <mark
                        onClick={() => setActiveId(prev => prev === 'a6' ? null : 'a6')}
                        className={`font-semibold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                          activeId === 'a6' ? 'bg-rose-200 text-rose-950 ring-2 ring-rose-500 font-bold shadow-xs' : 'bg-rose-50 text-rose-800 border-b-2 border-rose-300 hover:bg-rose-100'
                        }`}
                      >
                        Peer tutoring had no significant effect on algebra scores (p=0.38)
                      </mark>
                      , suggesting that tutoring alone does not improve academic outcomes without structural support.
                    </p>
                  </section>

                  {/* CHAPTER 5 */}
                  <section id="inline-chapter-5" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] mono uppercase tracking-widest text-indigo-600 font-bold block">
                          CHAPTER 5
                        </span>
                        <h3 className="font-serif text-xl font-bold text-gray-900 mt-0.5">
                          Conclusions and Recommendations
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        Major Issue
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                      The findings confirm that academic workload is the most consistent predictor of burnout among STEM undergraduates in the sampled institutions. Peer support was found to moderate the workload–burnout relationship only when students had consistent access to structured support programs. It is recommended that universities{' '}
                      <mark
                        onClick={() => setActiveId(prev => prev === 'a6' ? null : 'a6')}
                        className={`font-semibold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                          activeId === 'a6' ? 'bg-rose-200 text-rose-950 ring-2 ring-rose-500 font-bold shadow-xs' : 'bg-rose-50 text-rose-800 border-b-2 border-rose-300 hover:bg-rose-100'
                        }`}
                      >
                        expand the peer tutoring program as a primary intervention strategy
                      </mark>
                      . Student affairs offices should deploy workload monitoring systems across all STEM departments to catch early signs of burnout and deploy timely interventions.
                    </p>
                  </section>
                </div>
              )}
            </div>
            </>)}

            {/* ── Inconsistencies tab ── */}
            {activeTab === 'inconsistencies' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                  <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">
                    {filterType === 'major-issue' ? 'Major Issues' : filterType === 'affected-section' ? 'Affected Sections' : 'All Inconsistencies'} ({visibleInconsistencies.length})
                  </p>
                  {(filterType === 'major-issue' || filterType === 'affected-section') && (
                    <button type="button" onClick={() => setFilterType('all')}
                      className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">
                      Show all ({inconsistenciesCount})
                    </button>
                  )}
                </div>

                {visibleInconsistencies.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 px-6 py-10 text-center">
                    <p className="text-sm font-bold text-gray-800 mb-1">No inconsistencies to show</p>
                    <p className="text-xs text-gray-500">
                      {inconsistenciesCount === 0
                        ? 'No inconsistencies were detected across the analyzed sections.'
                        : 'No findings match the selected filter.'}
                    </p>
                  </div>
                ) : (
                  visibleInconsistencies.map((item, idx) => (
                    <div key={item.id}
                      onClick={() => setActiveId(prev => prev === item.id ? null : item.id)}
                      className={`bg-white rounded-2xl border p-5 space-y-3 cursor-pointer transition-all ${
                        activeId === item.id ? `${ST[item.type].border} ring-2 ring-indigo-300 shadow-sm` : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ST[item.type].pill}`}>{ST[item.type].label}</span>
                        <span className="text-xs mono font-bold text-gray-400">#{idx + 1}</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 leading-snug">{item.title}</h3>
                        <p className="text-xs font-semibold mt-0.5" style={{ color: ST[item.type].accentColor }}>{item.section}</p>
                      </div>
                      {item.description && <p className="text-[13px] text-gray-700 leading-relaxed">{item.description}</p>}
                      {item.conflictsWith && item.conflictQuote && (
                        <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
                          <p className="text-[10px] mono font-bold uppercase tracking-wider text-gray-500 mb-1">Conflicts with: {item.conflictsWith}</p>
                          <p className="text-xs text-gray-700 italic leading-relaxed">"{item.conflictQuote}"</p>
                        </div>
                      )}
                      {item.recommendation && (
                        <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3">
                          <p className="text-[10px] mono font-bold uppercase tracking-wider text-indigo-800 mb-1">Suggested fix</p>
                          <p className="text-xs text-indigo-950 font-medium leading-relaxed">{item.recommendation}</p>
                        </div>
                      )}
                      {renderFeedback(item)}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Coherence Pairs tab ── */}
            {activeTab === 'strong_coherence' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                  <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">
                    Coherence pairs ({visiblePairs.length}) · target = {PAR_SCORE}
                  </p>
                  {filterType === 'strength' && (
                    <button type="button" onClick={() => setFilterType('all')}
                      className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">
                      Show all ({pairsCount})
                    </button>
                  )}
                </div>

                {visiblePairs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 px-6 py-10 text-center">
                    <p className="text-sm font-bold text-gray-800 mb-1">No role pairs to show</p>
                    <p className="text-xs text-gray-500">
                      {pairsCount === 0
                        ? 'No coherence pairs were evaluated for this scan. Required sections may be missing.'
                        : `No pairs meet the target score of ${PAR_SCORE}.`}
                    </p>
                  </div>
                ) : (
                  visiblePairs.map((p, idx) => {
                    const score = p.score ?? 0;
                    const strong = score >= PAR_SCORE;
                    return (
                      <div key={`${p.role_a}|${p.role_b}|${idx}`} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-gray-900">{formatRoleLabel(p.role_a)} ↔ {formatRoleLabel(p.role_b)}</p>
                          <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${strong ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                            {strong ? 'Strong' : 'Below target'} · {Math.round(score)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${strong ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
                        </div>
                        <p className="text-[11px] text-gray-500">Weight {Math.round(p.weight * 100)}% of the coherence score</p>
                        {p.verification && (
                          <p className={`text-xs leading-relaxed rounded-xl border px-3 py-2 ${
                            p.verification.alignment === 'superficial' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          }`}>
                            <span className="font-bold capitalize">{p.verification.alignment} alignment.</span> {p.verification.note}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Citations tab ── */}
            {activeTab === 'citations' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['live', 'restricted', 'neutral', 'dead'] as Citation["status"][]).map(s => (
                    <div key={s} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                      <p className="text-[10px] mono font-bold uppercase tracking-wider text-gray-400">{CITE_BADGE[s].label}</p>
                      <p className="text-xl font-black text-gray-900 mt-0.5">{citeCount(s)}</p>
                    </div>
                  ))}
                </div>

                {localCitations.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 px-6 py-10 text-center">
                    <p className="text-sm font-bold text-gray-800 mb-1">No citations to show</p>
                    <p className="text-xs text-gray-500">
                      No citations were detected in this manuscript ({scan?.citations_audited ?? 0} sources audited).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {localCitations.map((cite, ci) => (
                      <div key={cite.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${CITE_BADGE[cite.status].row}`}>
                        <span className="text-[11px] mono font-bold text-gray-300 mt-0.5 w-5 shrink-0">{ci + 1}</span>
                        <div className="flex-1 min-w-0">
                          {cite.title && <p className="text-sm font-bold text-gray-900 mb-0.5 leading-snug">{cite.title}</p>}
                          <p className="text-[13px] text-gray-800 leading-snug">
                            {cite.authors && <span className="font-medium mr-1">{cite.authors}.</span>}
                            {cite.year && <span className="text-gray-500 mr-1">({cite.year}).</span>}
                            {cite.ref}
                          </p>
                          {cite.url && (/^https?:\/\//i.test(cite.url)
                            ? <a href={cite.url} target="_blank" rel="noopener noreferrer" className="text-[11px] mono truncate mt-1 block text-indigo-600 hover:underline">{cite.url}</a>
                            : <p className="text-[11px] mono truncate mt-1 text-gray-400">{cite.url}</p>)}
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${CITE_BADGE[cite.status].badge}`}>
                          {CITE_BADGE[cite.status].label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Writing Style tab ── */}
            {activeTab === 'originality' && (
              <div className="space-y-4">
                {aiText && aiText.overall_score != null ? (
                  <>
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                      <div className="flex items-baseline justify-between gap-3 flex-wrap">
                        <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">Stylometric reading · advisory only</p>
                        <p className="text-3xl font-black text-gray-900">{Math.round(aiText.overall_score)}<span className="text-sm font-bold text-gray-400"> / 100</span></p>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(0, Math.min(100, aiText.overall_score))}%` }} />
                      </div>
                      <p className="text-xs text-gray-600">
                        {(aiText.flagged_sections?.length ?? 0) > 0
                          ? `Sections with an elevated reading: ${aiText.flagged_sections!.map(formatRoleLabel).join(', ')}.`
                          : 'No individual section stands out.'}
                      </p>
                    </div>

                    {Object.entries(aiText.section_scores ?? {}).filter(([, v]) => v != null).length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
                        <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">By section</p>
                        {Object.entries(aiText.section_scores ?? {}).filter(([, v]) => v != null).map(([sec, v]) => (
                          <div key={sec} className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-gray-700 w-40 shrink-0 truncate">{formatRoleLabel(sec)}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-400" style={{ width: `${Math.max(0, Math.min(100, v as number))}%` }} />
                            </div>
                            <span className="text-xs mono font-bold text-gray-600 w-8 text-right">{Math.round(v as number)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 px-6 py-10 text-center">
                    <p className="text-sm font-bold text-gray-800 mb-1">No writing-style reading available</p>
                    <p className="text-xs text-gray-500">No writing-style score was produced for this scan.</p>
                  </div>
                )}

                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4">
                  <p className="text-[10px] mono font-bold uppercase tracking-wider text-amber-800 mb-1">Advisory</p>
                  <p className="text-xs text-amber-950 leading-relaxed">{aiText?.disclaimer || AI_TEXT_DISCLAIMER}</p>
                </div>
              </div>
            )}

            <div className="h-10" />
          </div>{/* end max-w wrapper */}
        </div>{/* end center column */}

        {/* ══ RIGHT: Explainable AI & Recommendations Panel ══ */}
        <div className={`${mobilePane === "xai" ? "flex w-full" : "hidden"} print:flex lg:flex lg:w-[360px] xl:w-[420px] 2xl:w-[460px] shrink-0 border-l border-gray-100 bg-white flex-col overflow-hidden`}>
          <div className="shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/90">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: BL, color: B }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 leading-tight">Detailed Findings & Recommendations</h3>
                <p className="text-[11px] mono font-bold uppercase tracking-wider text-indigo-600">Analysis Inspector</p>
              </div>
            </div>
            {activeItem && (
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="text-xs text-gray-500 hover:text-gray-900 font-bold px-2 py-1 rounded-md hover:bg-gray-100 transition-colors">
                Reset
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {!activeItem ? (
              <div className="flex flex-col items-center justify-center min-h-full px-6 py-8 text-center gap-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xs" style={{ background: BL }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8" style={{ color: B }}>
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold uppercase mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    {isSample ? "Moderate Coherence Overall" : `${scan?.score_breakdown?.band || "Unknown"} Coherence`}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Analysis Synthesis</h3>
                  <p className="text-[15px] text-gray-600 leading-relaxed font-serif italic mb-4">
                    “{isSample ? OVERALL_ASSESSMENT.question : "What is the actual condition of this manuscript based on the analysis?"}”
                  </p>
                  <p className="text-sm sm:text-[15px] text-gray-800 leading-relaxed text-left bg-gray-50/90 p-4 sm:p-5 rounded-2xl border border-gray-200/80">
                    {isSample 
                      ? OVERALL_ASSESSMENT.statusDescription 
                      : (() => {
                          const band = scan?.score_breakdown?.band || "Unknown";
                          const reason = scan?.score_breakdown?.biggest_lever?.reason;
                          if (!reason) return "To be developed";
                          const truncatedReason = reason.length > 120 ? reason.slice(0, 117) + "..." : reason;
                          return `Coherence band: ${band}. ${truncatedReason}`;
                        })()
                    }
                  </p>
                </div>

                {/* XAI & Recommendations Info Notice */}
                <div className="w-full text-left p-4 rounded-2xl border border-indigo-100 bg-indigo-50/60">
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg className="w-4 h-4 text-indigo-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">Analysis Guidance</span>
                  </div>
                  <p className="text-xs sm:text-[13px] text-indigo-900/80 leading-relaxed">
                    Click any highlighted passage or sidebar finding to inspect why the AI flagged it, view cross-chapter evidence, and read specific rewrite recommendations.
                  </p>
                </div>

                {/* Categories Breakdown */}
                <div className="w-full mt-1 space-y-2 text-left">
                  <p className="text-xs mono font-bold uppercase tracking-wider text-gray-400 px-1">Categories Breakdown</p>
                  {(["strength", "major-issue", "affected-section"] as AssessmentType[]).map(t => (
                    <div key={t}
                      onClick={() => applyFilter(t)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:opacity-95 transition-all border border-transparent hover:border-gray-200" style={{ background: `${ST[t].accentColor}0d` }}>
                      <span className={`w-3.5 h-3.5 rounded-sm shrink-0 ${ST[t].dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs sm:text-sm font-bold ${ST[t].pillTxt}`}>{ST[t].label}</p>
                        <p className="text-xs text-gray-500 leading-snug mt-0.5">{ASSESSMENT_TYPE_INFO[t].question}</p>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-gray-600 bg-white/80 px-2.5 py-1 rounded-lg border border-gray-100">
                        {localItems.filter(i => i.type === t).length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-6 py-6 space-y-5">

                {/* Finding header */}
                <div className={`rounded-2xl p-5 border-2 ${ST[activeItem.type].border} ${ST[activeItem.type].bg}`}>
                  <div className="flex items-start justify-between mb-2.5">
                    <AssessmentBadge type={activeItem.type} />
                    <button onClick={() => setActiveId(null)} className="text-gray-400 hover:text-gray-700 transition-colors -mt-0.5 p-1 rounded-lg hover:bg-black/5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug mb-1.5">{activeItem.title}</h3>
                  <p className="text-xs sm:text-sm font-semibold" style={{ color: ST[activeItem.type].accentColor }}>{activeItem.section}</p>
                </div>

                {/* ── SECTION 1: EXPLAINABLE AI REASONING ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-indigo-600">
                      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                    </svg>
                    <span className="text-xs mono font-bold uppercase tracking-wider text-gray-500">Detailed Analysis</span>
                  </div>

                  {/* Purpose / Question Prompt */}
                  <div className="space-y-1">
                    <p className="text-xs mono font-bold uppercase tracking-wider text-gray-400">Analysis Dimension</p>
                    <p className="text-sm sm:text-[15px] text-gray-800 font-serif italic leading-relaxed">“{activeItem.questionOrSubtitle}”</p>
                  </div>

                  {/* What was detected */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-500 shrink-0">
                        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                      </svg>
                      <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">Why the AI Flagged This</p>
                    </div>
                    <p className="text-sm sm:text-[15px] text-gray-800 leading-relaxed font-normal bg-gray-50 p-4 rounded-2xl border border-gray-200/80">
                      {activeItem.description}
                    </p>
                  </div>

                  {/* Why this matters for panel */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0" style={{ color: ST[activeItem.type].accentColor }}>
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">Significance for Panel / Defense</p>
                    </div>
                    <p className="text-sm sm:text-[15px] text-gray-700 leading-relaxed bg-white p-3.5 rounded-xl border border-gray-100">{activeItem.significance}</p>
                  </div>

                  {/* Cross-chapter conflict quote */}
                  {activeItem.conflictsWith && activeItem.conflictQuote && (
                    <div className={`rounded-2xl p-4 border ${ST[activeItem.type].border}`} style={{ background: `${ST[activeItem.type].accentColor}0a` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0" style={{ color: ST[activeItem.type].accentColor }}>
                          <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <p className="text-xs mono font-bold uppercase tracking-wider" style={{ color: ST[activeItem.type].accentColor }}>Cross-Section Comparison Evidence</p>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-gray-800 mb-2">{activeItem.conflictsWith}</p>
                      <p className="text-sm text-gray-800 leading-relaxed italic bg-white rounded-xl px-4 py-3 border border-gray-200/80 shadow-2xs">
                        "{activeItem.conflictQuote}"
                      </p>
                    </div>
                  )}

                  {/* Verified Evidence quote */}
                  {activeItem.evidence && (
                    <div className="rounded-2xl p-4 border border-emerald-200 bg-emerald-50/50">
                      <div className="flex items-center gap-2 mb-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-emerald-700"><path d="M5 12l5 5L20 7" /></svg>
                        <p className="text-xs mono font-bold uppercase tracking-wider text-emerald-800">Verified Evidence in Manuscript</p>
                      </div>
                      <p className="text-sm text-emerald-950 leading-relaxed italic bg-white rounded-xl px-4 py-3 border border-emerald-200/80 shadow-2xs">
                        "{activeItem.evidence}"
                      </p>
                    </div>
                  )}
                </div>

                {/* ── SECTION 2: ACTIONABLE RECOMMENDATIONS ── */}
                <div className="rounded-2xl p-5 border-2 border-indigo-200/90 shadow-sm" style={{ background: `linear-gradient(135deg, ${BL}, #f5f7ff)` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: B }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs mono font-bold uppercase tracking-wider" style={{ color: B }}>Actionable Recommendation</p>
                      <p className="text-[11px] text-gray-500 font-medium">Adviser Guidance & Revision Step</p>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-gray-900 leading-relaxed mt-2.5">
                    {activeItem.recommendation}
                  </p>
                </div>

                {/* Feedback — guarded */}
                {activeItem && renderFeedback(activeItem)}

                {/* Prev / Next controls */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500 mono font-semibold">Finding {itemIdx + 1} of {localItems.length}</span>
                  <div className="flex gap-2">
                    {([{ dir: -1, label: "← Previous" }, { dir: 1, label: "Next →" }]).map(({ dir, label }) => {
                      const target = localItems[itemIdx + dir];
                      return (
                        <button key={label} disabled={!target}
                          onClick={() => {
                            if (target) {
                              setActiveId(target.id);
                              scrollToSection(target.targetSectionIndex);
                            }
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Mobile bottom navigation bar ── */}
      <nav className="lg:hidden shrink-0 grid grid-cols-3 border-t border-gray-200 bg-white print:hidden z-30" aria-label="Mobile report panes">
        {([
          { id: "findings" as const, label: "Summary" },
          { id: "report" as const, label: "Manuscript" },
          { id: "xai" as const, label: "Inspector" },
        ]).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobilePane(id)}
            aria-current={mobilePane === id ? "page" : undefined}
            className={`py-3 text-xs font-bold transition-colors ${
              mobilePane === id
                ? "text-indigo-600 border-t-2 border-indigo-600 -mt-px bg-indigo-50/30"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── Auth shared ──────────────────────────────────────────────────────────────
function AuthLayout({ children, onNavigate }: { children: React.ReactNode; onNavigate: (s: Screen) => void; quote?: string }) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between relative overflow-x-hidden" style={{ background: "#f8f9ff" }}>
      {/* Background decorations matching landing page and dashboard */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, rgba(26,31,204,0.06) 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)" }} />

      {/* Top navigation header */}
      <header className="relative z-10 w-full px-6 md:px-10 lg:px-16 xl:px-20 py-6 flex items-center justify-between">
        <button onClick={() => onNavigate("home")} className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <Logo className="h-9 w-auto" />
        </button>
        <button
          onClick={() => onNavigate("home")}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-sm text-xs font-semibold text-gray-600 hover:bg-white hover:text-gray-900 transition-all shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back to home
        </button>
      </header>

      {/* Main centered card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[440px] bg-white rounded-3xl border border-gray-100 p-8 sm:p-10 shadow-xl" style={{ boxShadow: "0 12px 40px rgba(26,31,204,0.06)" }}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} ReSync · AI-Powered Academic Coherence Engine · All rights reserved
      </footer>
    </div>
  );
}

function FieldInput({ label, type = "text", value, onChange, placeholder, right }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder: string; right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
        {right}
      </div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        className="w-full h-11 px-4 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all"
        style={{ borderColor: focused ? B : "#e5e7eb", boxShadow: focused ? `0 0 0 3px ${B}12` : "none" }} />
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onNavigate, onLoginSuccess }: { onNavigate: (s: Screen) => void; onLoginSuccess?: () => void }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canSubmit = !!email && !!pw && !loading;

  // Forgot password modal state
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail || forgotLoading) return;
    setForgotLoading(true);
    setForgotError("");
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setForgotLoading(false);
    if (error) {
      setForgotError("Unable to process request. Please try again later.");
    } else {
      setForgotSuccess(true);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      onLoginSuccess?.();
    }
  }

  return (
    <AuthLayout onNavigate={onNavigate}>
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase mb-3" style={{ background: BL, color: B }}>
            Academic Portal
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Welcome back</h1>
          <p className="text-xs text-gray-500 leading-relaxed">Sign in to review your research manuscript and coherence reports.</p>
        </div>

        {/* Google SSO */}
        <button
          type="button"
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })}
          className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all mb-5 shadow-sm"
        >
          <GIcon /> Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[10px] text-gray-400 font-bold tracking-wider">OR SIGN IN WITH EMAIL</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="maria.santos@dlsu.edu.ph"
                required
                className="w-full h-11 pl-10 pr-4 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all"
                style={{ borderColor: "#e5e7eb" }}
                onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
              />
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotSuccess(false);
                  setForgotError("");
                  setForgotModal(true);
                }}
                className="text-xs font-semibold hover:underline"
                style={{ color: B }}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full h-11 pl-10 pr-11 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all"
                style={{ borderColor: "#e5e7eb" }}
                onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
              />
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              </div>
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Eye open={showPw} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all mt-2"
            style={{
              background: canSubmit ? `linear-gradient(135deg, ${B}, ${BH})` : "#f3f4f6",
              color: canSubmit ? "white" : "#9ca3af",
              cursor: canSubmit ? "pointer" : "not-allowed",
              boxShadow: canSubmit ? `0 6px 20px ${B}30` : "none"
            }}
          >
            {loading ? <><Spinner /> Signing in…</> : "Sign in to ReSync →"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          Don't have an account?{" "}
          <button onClick={() => onNavigate("signup")} className="font-bold hover:underline" style={{ color: B }}>Sign up free</button>
        </p>

        <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-[11px] text-gray-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
          <span>256-bit encryption · Academic manuscript privacy guaranteed</span>
        </div>

        {forgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-base font-bold text-gray-900">Reset Password</h3>
                <button
                  type="button"
                  onClick={() => setForgotModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                {forgotSuccess ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-100">
                      If an account exists for that email, a reset link has been sent.
                    </div>
                    <button
                      type="button"
                      onClick={() => setForgotModal(false)}
                      className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all cursor-pointer"
                      style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                    {forgotError && (
                      <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                        {forgotError}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email address</label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="maria.santos@dlsu.edu.ph"
                        required
                        className="w-full h-11 px-4 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all"
                        style={{ borderColor: "#e5e7eb" }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!forgotEmail || forgotLoading}
                      className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all mt-2"
                      style={{
                        background: (forgotEmail && !forgotLoading) ? `linear-gradient(135deg, ${B}, ${BH})` : "#f3f4f6",
                        color: (forgotEmail && !forgotLoading) ? "white" : "#9ca3af",
                        cursor: (forgotEmail && !forgotLoading) ? "pointer" : "not-allowed",
                      }}
                    >
                      {forgotLoading ? <><Spinner /> Sending reset link…</> : "Send reset link"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}

// ─── Signup ───────────────────────────────────────────────────────────────────
function SignupScreen({ onNavigate, onSignupSuccess }: { onNavigate: (s: Screen) => void; onSignupSuccess?: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);

  const str = pw.length === 0 ? 0 : pw.length < 8 ? 1 : pw.length < 12 ? 2 : 3;
  const strMeta = [
    { label: "", color: "", bar: "" },
    { label: "Weak", color: "#ef4444", bar: "#f87171" },
    { label: "Good", color: "#d97706", bar: "#fbbf24" },
    { label: "Strong", color: "#16a34a", bar: "#4ade80" },
  ][str];
  const canSubmit = !!name && !!email && pw.length >= 8 && agreed && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      onSignupSuccess?.();
    }
  }

  return (
    <AuthLayout onNavigate={onNavigate}>
      <div>
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase mb-3" style={{ background: BL, color: B }}>
            New Account
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Create your account</h1>
          <p className="text-xs text-gray-500 leading-relaxed">Free to use — no credit card required.</p>
        </div>

        <button
          type="button"
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })}
          className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all mb-5 shadow-sm"
        >
          <GIcon />Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-100" /><span className="text-[10px] text-gray-400 font-bold tracking-wider">OR REGISTER WITH EMAIL</span><div className="flex-1 h-px bg-gray-100" />
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <FieldInput label="Full name" value={name} onChange={setName} placeholder="Maria Santos" />
          <FieldInput label="Email address" type="email" value={email} onChange={setEmail} placeholder="maria.santos@dlsu.edu.ph" />

          {/* password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 8 characters" required
                className="w-full h-11 px-4 pr-11 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all"
                style={{ borderColor: "#e5e7eb" }}
                onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                <Eye open={showPw} />
              </button>
            </div>
            {pw.length > 0 && (
              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3].map(n => <div key={n} className="h-1 flex-1 rounded-full transition-all duration-300" style={{ background: str >= n ? strMeta.bar : "#e5e7eb" }} />)}
                </div>
                <span className="text-xs font-bold" style={{ color: strMeta.color }}>{strMeta.label}</span>
              </div>
            )}
          </div>

          {/* terms */}
          <div className="flex items-start gap-3 w-full text-left select-none pt-1">
            <button
              type="button"
              onClick={() => setAgreed(!agreed)}
              className="mt-0.5 w-[18px] h-[18px] min-w-[18px] rounded-md border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer"
              style={{ background: agreed ? B : "white", borderColor: agreed ? B : "#d1d5db" }}
              aria-label="Agree to terms"
            >
              {agreed && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" className="w-2.5 h-2.5"><path d="M5 12l5 5L20 7" /></svg>}
            </button>
            <span className="text-xs text-gray-500 leading-relaxed">
              I agree to the{" "}
              <button
                type="button"
                onClick={() => setLegalModal("terms")}
                className="font-bold hover:underline cursor-pointer"
                style={{ color: B }}
              >
                Terms of Service
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={() => setLegalModal("privacy")}
                className="font-bold hover:underline cursor-pointer"
                style={{ color: B }}
              >
                Privacy Policy
              </button>
            </span>
          </div>

          <button type="submit" disabled={!canSubmit}
            className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all mt-1"
            style={{ background: canSubmit ? `linear-gradient(135deg, ${B}, ${BH})` : "#f3f4f6", color: canSubmit ? "white" : "#9ca3af", cursor: canSubmit ? "pointer" : "not-allowed", boxShadow: canSubmit ? `0 6px 20px ${B}30` : "none" }}>
            {loading ? <><Spinner />Creating account…</> : "Create account →"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          Already have an account?{" "}
          <button onClick={() => onNavigate("login")} className="font-bold hover:underline" style={{ color: B }}>Log in</button>
        </p>

        {legalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {legalModal === "terms" ? "Terms of Service" : "Privacy Policy"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Last updated: October 2026</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLegalModal(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4 text-xs text-gray-600 leading-relaxed">
                {legalModal === "terms" ? (
                  <>
                    <p>
                      Welcome to Resync. By uploading or analyzing academic manuscripts, theses, dissertations, or research documents through our platform, you agree to comply with and be bound by these Terms of Service.
                    </p>
                    <h4 className="font-bold text-gray-800 text-sm">1. Academic Integrity & Intellectual Property</h4>
                    <p>
                      You retain all ownership, copyright, and intellectual property rights in and to your uploaded manuscripts and research materials. Resync does not claim any ownership over your manuscripts. You represent that you have all necessary rights to submit manuscripts for structural and coherence analysis.
                    </p>
                    <h4 className="font-bold text-gray-800 text-sm">2. Use of Analysis Tools</h4>
                    <p>
                      Resync provides automated section alignment, cross-chapter coherence checks, and citation accessibility scanning. Analysis results and recommendations are advisory tools intended to assist scholarly writing and revision, and should be evaluated in accordance with your institution's academic guidelines.
                    </p>
                    <h4 className="font-bold text-gray-800 text-sm">3. Account Security</h4>
                    <p>
                      You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your Resync account.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Resync is committed to protecting the privacy and confidentiality of researchers, scholars, and academic institutions using our manuscript verification service.
                    </p>
                    <h4 className="font-bold text-gray-800 text-sm">1. Information We Collect</h4>
                    <p>
                      We collect account information (such as your name and email address) and document content that you submit solely to perform manuscript structural and coherence analysis.
                    </p>
                    <h4 className="font-bold text-gray-800 text-sm">2. Manuscript Confidentiality & Data Protection</h4>
                    <p>
                      Your manuscripts, research findings, and unpublished drafts are treated with strict confidentiality. Resync does not use your private manuscripts to train public generative models or distribute them to third parties without your explicit authorization.
                    </p>
                    <h4 className="font-bold text-gray-800 text-sm">3. Data Retention & Deletion</h4>
                    <p>
                      Analysis data and scanned documents are stored securely using industry-standard encryption. You may request the deletion of your account and associated document data at any time through your account settings or by contacting support.
                    </p>
                  </>
                )}
              </div>
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setLegalModal(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  style={{ background: B, color: "white" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}

// ─── Reset Password ────────────────────────────────────────────────────────────
function ResetPasswordScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const canSubmit = password.length >= 8 && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onNavigate("login");
      }, 2500);
    }
  }

  return (
    <AuthLayout onNavigate={onNavigate}>
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase mb-3" style={{ background: BL, color: B }}>
            Security
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Set new password</h1>
          <p className="text-xs text-gray-500 leading-relaxed">Enter your new account password below.</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-100">
            Password updated successfully! Redirecting to login…
          </div>
        )}

        {!success ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="w-full h-11 pl-10 pr-11 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all"
                  style={{ borderColor: "#e5e7eb" }}
                  onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                  onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                />
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <Eye open={showPw} />
                </button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <p className="text-[11px] text-amber-600 mt-1">Must be at least 8 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all mt-2"
              style={{
                background: canSubmit ? `linear-gradient(135deg, ${B}, ${BH})` : "#f3f4f6",
                color: canSubmit ? "white" : "#9ca3af",
                cursor: canSubmit ? "pointer" : "not-allowed",
                boxShadow: canSubmit ? `0 6px 20px ${B}30` : "none"
              }}
            >
              {loading ? <><Spinner /> Updating password…</> : "Update Password →"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white transition-all mt-2 cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}
          >
            Go to login →
          </button>
        )}

        <p className="text-center text-xs text-gray-500 mt-6">
          Remembered your credentials?{" "}
          <button onClick={() => onNavigate("login")} className="font-bold hover:underline" style={{ color: B }}>Back to login</button>
        </p>
      </div>
    </AuthLayout>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardScreen({ onNavigate, session, onLogout }: { onNavigate: (s: Screen) => void; session?: Session | null; onLogout?: () => void }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const [activeNav, setActiveNav] = useState<"Dashboard" | "Academic Profile" | "Settings" | "Usage / Credits">("Dashboard");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({
    fullName: session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User',
    email: session?.user?.email || '',
    contactNumber: "",
  });
  const [draft, setDraft] = useState(profile);
  function saveProfile() { setProfile(draft); setEditMode(false); }
  function cancelEdit() { setDraft(profile); setEditMode(false); }

  useEffect(() => {
    if (session?.user) {
      setProfile(prev => ({
        ...prev,
        fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || prev.fullName || 'User',
        email: session.user.email || prev.email || '',
      }));
    }
  }, [session]);

  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [creditsUsed, setCreditsUsed] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    setCreditsLoading(true);
    Promise.all([
      getCreditBalance(session.user.id),
      getCreditHistory(session.user.id, 100),
    ]).then(([bal, hist]) => {
      setCreditBalance(bal.balance);
      const used = hist.entries
        .filter(e => e.kind === 'debit')
        .reduce((a, e) => a + Math.abs(e.delta), 0);
      setCreditsUsed(used);
    }).catch((e) => {
      console.error('credits fetch failed:', e);
      setCreditBalance(null);
      setCreditsUsed(null);
    }).finally(() => {
      setCreditsLoading(false);
    });
  }, [session?.user?.id]);

  // Settings: Password change states
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSuccessMsg, setPwSuccessMsg] = useState("");
  const [pwErrorMsg, setPwErrorMsg] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwErrorMsg("");
    setPwSuccessMsg("");
    if (!currentPw) {
      setPwErrorMsg("Please enter your current password.");
      return;
    }
    if (newPw.length < 8) {
      setPwErrorMsg("New password must be at least 8 characters long.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwErrorMsg("New passwords do not match.");
      return;
    }
    setPwLoading(true);
    setTimeout(() => {
      setPwLoading(false);
      setPwSuccessMsg("Your password has been updated successfully.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    }, 800);
  }

  useEffect(() => {
    if (!profileMenuOpen) return;
    function closeProfileMenu(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileMenuOpen(false);
    }
    document.addEventListener("mousedown", closeProfileMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeProfileMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileMenuOpen]);

  const WHAT_GET = [
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>,
      label: "Coherence Score",
      desc: "A 0–100 integrity score with three sub-scores: logic, consistency, and citations.",
      color: B,
      bg: BL,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M9 12h6M9 16h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>,
      label: "Annotated Manuscript",
      desc: "Full text with every flagged passage highlighted inline by issue type.",
      color: "#7c3aed",
      bg: "#f5f3ff",
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 000 4h6a2 2 0 000-4M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
      label: "Fix Recommendations",
      desc: "Concrete, actionable rewrites for each flagged issue — ready to apply.",
      color: "#059669",
      bg: "#f0fdf4",
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>,
      label: "Verified Reference List",
      desc: "Live / dead status for every cited URL and DOI in your bibliography.",
      color: "#d97706",
      bg: "#fffbeb",
    },
  ];

  const STEPS = [
    {
      num: 1,
      label: "Upload Manuscript",
      desc: "Upload your .docx file or paste a Google Docs share link.",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
    },
    {
      num: 2,
      label: "Set Type & Template",
      desc: "Choose Quantitative or Qualitative methodology, and edit our standard template.",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9" /></svg>,
    },
    {
      num: 3,
      label: "Coherence Scan",
      desc: "AI cross-checks logic gaps, contradictions, redundancies, and dead citations.",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
    },
    {
      num: 4,
      label: "Export Report",
      desc: "Download your annotated report and fix recommendations as a PDF.",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>,
    },
  ];

  const BEST_PRACTICES = [
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>,
      title: "Digital Text Manuscripts",
      desc: "Best with standard digital text files (.docx or Google Docs) for direct sentence-level alignment checks.",
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
      title: "Standard Academic Structure",
      desc: "Optimized for Chapter 1 through 5 formats (IMRaD or standard thesis structures) with clear headings.",
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>,
      title: "Single-Column Text Flow",
      desc: "Best with single-column layouts ensuring unambiguous narrative order between sections.",
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>,
      title: "Direct Prose Content",
      desc: "Evaluates narrative and argumentative prose; visual charts and images should have corresponding text captions.",
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>,
      title: "Open Reference Accessibility",
      desc: "Audits public URLs, DOIs, and accessible registries for reference verification.",
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      title: "Methodological Focus",
      desc: "Applies targeted validation rules for explicitly selected Quantitative or Qualitative studies.",
    },
  ];

  return (
    <div className="min-h-full" style={{ background: "#f8f9ff" }}>

      {/* ── Top nav ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100/80" style={{ boxShadow: "0 1px 0 rgba(26,31,204,.06)" }}>
        <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 h-15 flex items-center gap-4" style={{ height: 58 }}>
          <div className="flex items-center gap-3 shrink-0 mr-2">
            <Logo className="h-8 w-auto" />
            <div className="h-5 w-px bg-gray-100 hidden md:block" />
            <span className="text-[11px] mono font-bold uppercase tracking-widest text-gray-400 hidden md:block">Academic Workspace</span>
          </div>
          <nav className="flex items-center gap-0.5 flex-1">
            {(["Dashboard", "Academic Profile"] as const).map(label => (
              <button key={label} onClick={() => setActiveNav(label as typeof activeNav)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: activeNav === label ? B : "transparent", color: activeNav === label ? "white" : "#6b7280", boxShadow: activeNav === label ? `0 2px 10px ${B}30` : "none" }}>
                {label === "Dashboard" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>}
                {label === "Academic Profile" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>}
                <span className="hidden sm:block">{label}</span>
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors hover:bg-gray-50 cursor-default"
              style={{ borderColor: `${B}20`, background: `${B}06`, color: B }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              Credits: {creditsLoading ? "…" : creditBalance !== null ? creditBalance : "—"}
            </div>
            <div className="h-5 w-px bg-gray-100" />
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-white" />
            </button>
            <div className="h-5 w-px bg-gray-100" />
            <div ref={profileMenuRef} className="relative">
              <button
                onClick={() => setProfileMenuOpen(open => !open)}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>
                </div>
                <p className="hidden md:block text-xs font-bold text-gray-800">{profile.fullName}</p>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3 h-3 text-gray-400 hidden md:block transition-transform ${profileMenuOpen ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
              </button>

              {profileMenuOpen && (
                <div role="menu" className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl z-50 animate-slide-in">
                  {[
                    {
                      label: "Dashboard",
                      action: () => setActiveNav("Dashboard"),
                      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
                    },
                    {
                      label: "Settings",
                      action: () => setActiveNav("Settings"),
                      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21h-4v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3v-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3h4v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0019.4 9c.12.6.65 1.03 1.26 1.03H21v4h-.09A1.65 1.65 0 0019.4 15z" /></svg>,
                    },
                    {
                      label: "Usage / Credits",
                      action: () => setActiveNav("Usage / Credits"),
                      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
                    },
                  ].map(item => (
                    <button key={item.label} role="menuitem" onClick={() => { item.action(); setProfileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                      <span className="text-gray-400">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                  <div className="h-px bg-gray-100 my-1" />
                  <button role="menuitem" onClick={() => { setProfileMenuOpen(false); onLogout?.(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {activeNav === "Settings" ? (
        <main className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-8 space-y-6">
          <div>
            <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: B }}>Account</p>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h2>
            <p className="text-xs text-gray-400 mt-1">Manage your account credentials, security, and preferences.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-3xl border border-gray-100 p-6" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: BL, color: B }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>
              </div>
              <h3 className="text-base font-bold text-gray-900">Profile information</h3>
              <p className="text-xs text-gray-400 mt-1 mb-5">Update your personal contact details and display name.</p>
              <button onClick={() => setActiveNav("Academic Profile")} className="text-xs font-bold hover:underline" style={{ color: B }}>Open Profile →</button>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 p-6" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gray-100 text-gray-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
              </div>
              <h3 className="text-base font-bold text-gray-900">Notifications</h3>
              <p className="text-xs text-gray-400 mt-1 mb-5">Scan completion alerts are currently sent to your account email.</p>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-xs font-semibold text-gray-600">Scan completion emails</span>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">Enabled</span>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fef3c7", color: "#d97706" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Change Password</h3>
                <p className="text-xs text-gray-400">Update your account password to maintain academic workspace security.</p>
              </div>
            </div>

            {pwSuccessMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4 text-green-600 shrink-0"><path d="M5 12l5 5L20 7" /></svg>
                <span className="font-semibold">{pwSuccessMsg}</span>
              </div>
            )}

            {pwErrorMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-600 shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span>{pwErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-xl">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full h-11 px-4 pr-11 rounded-xl border text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                    style={{ borderColor: "#e5e7eb" }}
                    onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                    onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Eye open={showCurrentPw} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full h-11 px-4 pr-11 rounded-xl border text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                    style={{ borderColor: "#e5e7eb" }}
                    onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                    onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Eye open={showNewPw} />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">Must be at least 8 characters long.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full h-11 px-4 pr-11 rounded-xl border text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                    style={{ borderColor: "#e5e7eb" }}
                    onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                    onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Eye open={showConfirmPw} />
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all flex items-center gap-2 shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${B}, ${BH})`, opacity: pwLoading ? 0.7 : 1 }}
                >
                  {pwLoading ? <><Spinner /> Updating…</> : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </main>
      ) : activeNav === "Usage / Credits" ? (
        <main className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-8 space-y-6">
          <div>
            <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: B }}>Account usage</p>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Usage / Credits</h2>
            <p className="text-xs text-gray-400 mt-1">View your available credits and current usage.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { value: creditsLoading ? "…" : creditBalance !== null ? String(creditBalance) : "—", label: "Credits available", color: B, bg: BL },
              { value: creditsLoading ? "…" : creditsUsed !== null ? String(creditsUsed) : "—", label: "Credits used", color: "#059669", bg: "#f0fdf4" },
              { value: "1 credit", label: "Cost per scan", color: "#d97706", bg: "#fffbeb" },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-3xl border border-gray-100 p-6" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ background: item.bg, color: item.color }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                </div>
                <p className="text-2xl font-bold mono" style={{ color: item.color }}>{item.value}</p>
                <p className="text-xs text-gray-400 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Ready to review a manuscript?</h3>
              <p className="text-xs text-gray-400 mt-1">Each complete coherence scan uses one credit.</p>
            </div>
            <button onClick={() => onNavigate("upload")} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: B }}>Start a Scan</button>
          </div>
        </main>
      ) : activeNav === "Academic Profile" ? (
        /* ═══════════════════════════════════════════════════
           ACADEMIC PROFILE VIEW (SIMPLIFIED)
        ═══════════════════════════════════════════════════ */
        <main className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-8 space-y-6">

          {/* Page header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: B }}>Account</p>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Academic Profile</h2>
              <p className="text-xs text-gray-400 mt-1">Manage your personal profile and contact information.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {editMode ? (
                <>
                  <button onClick={cancelEdit}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                  <button onClick={saveProfile}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}>
                    Save Changes
                  </button>
                </>
              ) : (
                <button onClick={() => { setDraft(profile); setEditMode(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:bg-gray-50"
                  style={{ borderColor: `${B}25`, color: B }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Identity & Profile Picture Card */}
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
            <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center gap-6" style={{ background: `linear-gradient(90deg, ${BL}, white)` }}>
              {/* Avatar with Photo change trigger */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md"
                  style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}>
                  {profile.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <label className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-400 cursor-pointer transition-all" title="Change profile picture">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  <input type="file" accept="image/*" className="hidden" onChange={() => alert("Profile photo upload dialog")} />
                </label>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {editMode ? (
                    <input
                      value={draft.fullName}
                      onChange={e => setDraft({ ...draft, fullName: e.target.value })}
                      placeholder="Full Name"
                      className="text-xl font-bold text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-1 focus:border-blue-500 outline-none w-full max-w-sm"
                    />
                  ) : (
                    <h3 className="text-xl font-bold text-gray-900">{profile.fullName}</h3>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-400"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  {profile.email}
                </p>
              </div>
            </div>

            {/* Contact Details List */}
            <div className="px-8 py-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Personal Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Full Name */}
                <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white border border-gray-200 text-gray-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400">Full Name</p>
                    {editMode ? (
                      <input
                        value={draft.fullName}
                        onChange={e => setDraft({ ...draft, fullName: e.target.value })}
                        className="text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-2.5 py-1 w-full mt-1 focus:outline-none focus:border-blue-400"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{profile.fullName}</p>
                    )}
                  </div>
                </div>

                {/* Email Address */}
                <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white border border-gray-200 text-gray-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400">Email Address</p>
                    {editMode ? (
                      <input
                        type="email"
                        value={draft.email}
                        onChange={e => setDraft({ ...draft, email: e.target.value })}
                        className="text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-2.5 py-1 w-full mt-1 focus:outline-none focus:border-blue-400"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{profile.email}</p>
                    )}
                  </div>
                </div>

                {/* Contact Number */}
                <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white border border-gray-200 text-gray-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400">Contact Number</p>
                    {editMode ? (
                      <input
                        type="tel"
                        value={draft.contactNumber}
                        onChange={e => setDraft({ ...draft, contactNumber: e.target.value })}
                        className="text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-2.5 py-1 w-full mt-1 focus:outline-none focus:border-blue-400"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{profile.contactNumber}</p>
                    )}
                  </div>
                </div>

                {/* Profile Picture Guidelines */}
                <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white border border-gray-200 text-gray-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400">Profile Picture</p>
                    <p className="text-xs text-gray-600 mt-1">JPEG or PNG, max 5MB. Click camera badge on avatar to upload.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security / Change Password Notice Banner */}
          <div className="rounded-3xl border border-gray-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ boxShadow: "0 2px 16px rgba(26,31,204,.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600 border border-amber-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Need to change your password?</p>
                <p className="text-[11px] text-gray-400">Password and security options are managed under Settings.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveNav("Settings")}
              className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors hover:bg-gray-50 self-start sm:self-auto"
              style={{ borderColor: `${B}30`, color: B }}
            >
              Go to Settings →
            </button>
          </div>

          <div className="h-4" />
        </main>
      ) : (<>

        {/* ══ HERO BANNER ══ */}
        <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, #080c33 0%, ${B} 60%, #3b40e8 100%)` }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, rgba(255,255,255,.09) 1px, transparent 1px)`, backgroundSize: "28px 28px" }} />
          <div className="absolute -top-24 right-40 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(165,180,252,.22) 0%, transparent 65%)" }} />

          <div className="relative z-10 w-full px-6 md:px-10 lg:px-16 xl:px-20 py-10 lg:py-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

              {/* Left: greeting + headline */}
              <div className="flex-1 min-w-0 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-3">
                  <span className="text-xs sm:text-sm font-semibold text-blue-100">
                    {greeting},{' '}
                    {session?.user?.user_metadata?.full_name?.split(' ')[0]
                      || session?.user?.email?.split('@')[0]
                      || 'there'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-2.5">
                  Your manuscript, <span className="text-indigo-200">checked end-to-end.</span>
                </h1>
                <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed font-normal">
                  Detect logic gaps, cross-chapter contradictions, terminology drift, and inaccessible citations — all in under 2 minutes.
                </p>
              </div>

              {/* Right: CTA + secondary link */}
              <div className="flex flex-wrap items-center gap-3.5 shrink-0 pt-2 lg:pt-0">
                <button onClick={() => onNavigate("upload")}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base text-gray-950 bg-white hover:bg-blue-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-indigo-700">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Start a Scan</span>
                </button>
                <button onClick={() => onNavigate("results")}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm sm:text-base text-white hover:bg-white/15 border-1.5 border-white/30 backdrop-blur-sm transition-all cursor-pointer">
                  <span>Preview sample</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-white/15">
              <div className="flex items-center gap-4 text-xs sm:text-sm text-blue-100/80 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  AI-Powered Multi-Model Pipeline
                </span>
                <span className="hidden sm:inline text-white/30">•</span>
                <span className="hidden sm:inline">Quantitative & Qualitative Support</span>
                <span className="hidden sm:inline text-white/30">•</span>
                <span className="hidden sm:inline">Automatic Citation Verifier</span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-blue-200 inline-flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                <span>~2 min average scan</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Main body ── */}
        <main className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-8 space-y-6">

          {/* ═══════════════════════════════════════════
            ROW 1: How It Works (left) + What You Get Back (right)
        ═══════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ── How It Works ── spans 2 cols */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-8" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
              <div className="mb-8">
                <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: B }}>Process</p>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">How It Works</h2>
                <p className="text-xs text-gray-400 mt-1">Four simple steps from manuscript to coherence report.</p>
              </div>

              {/* Staggered 4-step flow with bezier connectors */}
              {/*
              Layout (top-aligned flex, cards 2 & 4 pushed down by mt-10 ≈ 40px):
              Card height ≈ 180px → container height ≈ 220px
              Card 1 center-y ≈ 90   Card 2 center-y ≈ 130
              Connectors span the full 220px height with bezier curves between those y-values.
            */}
              <div className="flex items-start" style={{ minHeight: 220 }}>

                {/* Step 1 */}
                <div className="flex-1 min-w-0">
                  <div className="rounded-2xl p-5 flex flex-col items-center text-center gap-3 h-full" style={{ background: BL }}>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: B, color: "white" }}>
                      {STEPS[0].icon}
                    </div>
                    <div>
                      <span className="text-[10px] mono font-bold uppercase tracking-widest" style={{ color: B }}>Step 1</span>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{STEPS[0].label}</p>
                      <p className="text-[11px] text-gray-400 mt-1 leading-snug">{STEPS[0].desc}</p>
                    </div>
                  </div>
                </div>

                {/* Connector 1→2: bezier curving down-right */}
                <div className="shrink-0 self-stretch relative" style={{ width: 40 }}>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 40 220" preserveAspectRatio="none">
                    <path d="M0,90 C20,90 20,130 40,130" stroke="#c7d2fe" strokeWidth="2" strokeDasharray="5 4" fill="none" strokeLinecap="round" />
                    <polygon points="33,126 40,130 33,134" fill="#c7d2fe" />
                  </svg>
                </div>

                {/* Step 2 — shifted down */}
                <div className="flex-1 min-w-0 mt-10">
                  <div className="rounded-2xl p-5 flex flex-col items-center text-center gap-3" style={{ background: BL }}>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: B, color: "white" }}>
                      {STEPS[1].icon}
                    </div>
                    <div>
                      <span className="text-[10px] mono font-bold uppercase tracking-widest" style={{ color: B }}>Step 2</span>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{STEPS[1].label}</p>
                      <p className="text-[11px] text-gray-400 mt-1 leading-snug">{STEPS[1].desc}</p>
                    </div>
                  </div>
                </div>

                {/* Connector 2→3: bezier curving up-right */}
                <div className="shrink-0 self-stretch relative" style={{ width: 40 }}>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 40 220" preserveAspectRatio="none">
                    <path d="M0,130 C20,130 20,90 40,90" stroke="#c7d2fe" strokeWidth="2" strokeDasharray="5 4" fill="none" strokeLinecap="round" />
                    <polygon points="33,86 40,90 33,94" fill="#c7d2fe" />
                  </svg>
                </div>

                {/* Step 3 */}
                <div className="flex-1 min-w-0">
                  <div className="rounded-2xl p-5 flex flex-col items-center text-center gap-3" style={{ background: BL }}>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: B, color: "white" }}>
                      {STEPS[2].icon}
                    </div>
                    <div>
                      <span className="text-[10px] mono font-bold uppercase tracking-widest" style={{ color: B }}>Step 3</span>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{STEPS[2].label}</p>
                      <p className="text-[11px] text-gray-400 mt-1 leading-snug">{STEPS[2].desc}</p>
                    </div>
                  </div>
                </div>

                {/* Connector 3→4: bezier curving down-right */}
                <div className="shrink-0 self-stretch relative" style={{ width: 40 }}>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 40 220" preserveAspectRatio="none">
                    <path d="M0,90 C20,90 20,130 40,130" stroke="#c7d2fe" strokeWidth="2" strokeDasharray="5 4" fill="none" strokeLinecap="round" />
                    <polygon points="33,126 40,130 33,134" fill="#c7d2fe" />
                  </svg>
                </div>

                {/* Step 4 — shifted down */}
                <div className="flex-1 min-w-0 mt-10">
                  <div className="rounded-2xl p-5 flex flex-col items-center text-center gap-3" style={{ background: BL }}>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: B, color: "white" }}>
                      {STEPS[3].icon}
                    </div>
                    <div>
                      <span className="text-[10px] mono font-bold uppercase tracking-widest" style={{ color: B }}>Step 4</span>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{STEPS[3].label}</p>
                      <p className="text-[11px] text-gray-400 mt-1 leading-snug">{STEPS[3].desc}</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* ── What You Get Back ── */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
              <div className="mb-6">
                <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: "#059669" }}>Outputs</p>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">What You Get Back</h2>
                <p className="text-xs text-gray-400 mt-1">Four deliverables, every scan, automatically.</p>
              </div>

              <div className="space-y-4 flex-1">
                {WHAT_GET.map(({ icon, label, desc, color, bg }) => (
                  <div key={label} className="flex items-start gap-3 group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                      style={{ background: bg, color }}>
                      {icon}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-xs font-bold text-gray-800 leading-tight">{label}</p>
                      <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* ═══════════════════════════════════════════
            ROW 2: Recommended Scope / Best Results With
        ═══════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1 text-indigo-600">Guidance</p>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Best Results With</h2>
                <p className="text-xs text-gray-500 mt-1 max-w-lg leading-relaxed">ReSync delivers the most accurate cross-chapter analysis when manuscripts align with these recommended standards.</p>
              </div>
              <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BEST_PRACTICES.map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 px-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-gray-100/60 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-indigo-600 bg-white border border-gray-200">
                    {icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-tight">{title}</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed mt-1">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Template tip ── */}
          <div className="relative rounded-3xl overflow-hidden border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-5 flex items-center gap-5">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">Pro tip: Customize your standard template</p>
              <p className="text-xs text-amber-700 leading-relaxed mt-0.5">Select your research scope (Quantitative or Qualitative) and refine headings in our standard template to ensure maximum detection accuracy across chapters.</p>
            </div>
            <button onClick={() => onNavigate("upload")}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-200 text-amber-900 hover:bg-amber-300 transition-colors whitespace-nowrap">
              Try it →
            </button>
          </div>

          <div className="h-4" />
        </main>
      </>)}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [session, setSession] = useState<Session | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  const RESTORABLE_SCREENS: Screen[] = ['dashboard', 'upload'];

  useEffect(() => {
    const savedScreen = sessionStorage.getItem('resync_screen') as Screen | null;
    const isRecovery = window.location.pathname === '/reset-password' || window.location.hash.includes('type=recovery');

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (isRecovery) {
        setScreen("reset-password");
      } else if (session && savedScreen && RESTORABLE_SCREENS.includes(savedScreen)) {
        setScreen(savedScreen);
      } else if (session) {
        setScreen("dashboard");
      }
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setScreen("reset-password");
      } else if (event === 'SIGNED_IN' && session) {
        setScreen(prev => {
          if (['login', 'signup', 'home'].includes(prev)) {
            sessionStorage.setItem('resync_screen', 'dashboard');
            return "dashboard";
          }
          return prev;
        });
      } else if (!session) {
        setScreen(prev => {
          if (['dashboard', 'upload', 'processing', 'results'].includes(prev)) {
            sessionStorage.setItem('resync_screen', 'home');
            return "home";
          }
          return prev;
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  function navigate(s: Screen, asSample = false) {
    if (s === "dashboard" && !session) {
      setScreen("login");
      sessionStorage.setItem('resync_screen', 'login');
    } else {
      setIsSampleMode(asSample);
      setScreen(s);
      sessionStorage.setItem('resync_screen', s);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleLoginSuccess() {
    setIsSampleMode(false);
    setScreen("dashboard");
    sessionStorage.setItem('resync_screen', 'dashboard');
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    sessionStorage.setItem('resync_screen', 'home');
    setScreen('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white">
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}} @keyframes slide-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} .animate-slide-in{animation:slide-in .3s ease forwards}`}</style>
      {screen === "home" && <HomeScreen onNavigate={navigate} />}
      {screen === "upload" && <UploadScreen onNavigate={navigate} session={session} onScanComplete={(result) => { setScanResult(result); navigate("results"); }} />}
      {screen === "processing" && <ProcessingScreen onNavigate={navigate} />}
      {screen === "results" && <ResultsScreen onNavigate={navigate} scan={scanResult} isSample={isSampleMode} />}
      {screen === "login" && <LoginScreen onNavigate={navigate} onLoginSuccess={handleLoginSuccess} />}
      {screen === "signup" && <SignupScreen onNavigate={navigate} onSignupSuccess={() => navigate("dashboard")} />}
      {screen === "reset-password" && <ResetPasswordScreen onNavigate={navigate} />}
      {screen === "dashboard" && <DashboardScreen onNavigate={navigate} session={session} onLogout={handleLogout} />}
    </div>
  );
}



