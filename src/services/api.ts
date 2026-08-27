/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScanResult, Inconsistency, CitedReference, Suggestion, Verification } from '../types.js';
import { supabase } from '../lib/supabase.js';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

/**
 * The backend now verifies the caller's Supabase session server-side and
 * rejects any request whose bearer token doesn't match the user_id /
 * X-User-Id being acted on -- previously those fields were trusted as-is.
 * This attaches the current session's access token so authenticated calls
 * keep working; an expired/missing session just omits the header and lets
 * the backend's 401 surface naturally.
 */
export async function authHeaders(extra?: Record<string, string>): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ScanRequest {
  user_id: string;
  // Omit both — the backend creates a new manuscript row per scan
  // (scan-and-go: every submission is its own manuscript, not a shared
  // hardcoded row).
  manuscript_id?: string;
  manuscript_title?: string;
  doc_url: string;
  template_toc?: string[];
  style_reference_url?: string;
}

export interface InconsistencyReport {
  section_a: string;
  section_b: string;
  coherence_score: number | null;
  explanation_what: string;
  explanation_why: string;
  suggested_fix: string;
  inconsistency_id?: string;
  evidence_a?: string;
  evidence_b?: string;
  evidence_verified?: boolean;
  objectives_unaddressed?: string[];
  finding_status?: string;
}

export interface VerificationReport {
  role_a: string;
  role_b: string;
  score: number;
  alignment: string;
  note: string;
}

export interface CitationReport {
  citation_raw_reference_text: string;
  citation_is_accessible: boolean;
  citation_status?: string;
  citation_primary_link?: string;
  citation_authors_parsed?: string;
  citation_year_parsed?: number;
  citation_crossref_title?: string;
  citation_title_match_score?: number;
  citation_is_cited_in_text?: boolean;
}

export interface ScoreBreakdownResponse {
  overall_score: number;
  band: string;
  structural_completeness_score?: number | null;
  cross_chapter_coherence_score?: number | null;
  citation_integrity_score?: number | null;
  biggest_lever?: { criterion: string; current_score: number; potential_point_gain: number; reason: string } | null;
  structural_detail?: Record<string, any>;
  coherence_detail?: Record<string, any>;
  citation_detail?: Record<string, any>;
}

export interface AITextIndicatorResponse {
  overall_score?: number | null;
  section_scores?: Record<string, number | null>;
  flagged_sections?: string[];
  disclaimer?: string;
}

export interface ScanResponse {
  status: string;
  analysis_run_id: string;
  user_id: string;
  manuscript_id: string;
  doc_url: string;
  overall_coherence_score: number;
  sections_analyzed: string[];
  missing_sections: string[];
  has_all_required_sections: boolean;
  auto_detected?: boolean;
  detection_confidence?: number;
  section_scores: Array<Record<string, any>>;
  inconsistencies_found: number;
  inconsistencies: InconsistencyReport[];
  verifications?: VerificationReport[];
  citations_audited: number;
  citations: CitationReport[];
  score_breakdown?: ScoreBreakdownResponse;
  ai_text_indicator?: AITextIndicatorResponse;
  db_save_status: string;
  notification_dispatched: boolean;
  credits_remaining?: number;
}

export interface ScanOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Thrown when POST /api/scans/start returns 402 — the user has no scan
 * credits left. Callers should catch this specifically to open the top-up
 * flow instead of showing a generic error message. */
export class InsufficientCreditsError extends Error {
  balance: number;
  constructor(balance: number) {
    super('No scan credits remaining.');
    this.name = 'InsufficientCreditsError';
    this.balance = balance;
  }
}

/** How long to wait between status polls while a scan job runs. */
const POLL_INTERVAL_MS = 2500;

/** Consecutive poll failures tolerated before giving up on a running job. */
const MAX_CONSECUTIVE_POLL_FAILURES = 4;

/**
 * Extracts the most useful human-readable message from a failed response.
 */
async function extractErrorDetail(response: Response): Promise<string> {
  let errorDetail = `Backend returned status ${response.status} (${response.statusText})`;
  try {
    const errorJson = await response.json();
    if (errorJson.detail) {
      if (typeof errorJson.detail === 'string') {
        errorDetail = errorJson.detail;
      } else if (Array.isArray(errorJson.detail)) {
        // Pydantic validation errors
        errorDetail = errorJson.detail
          .map((e: any) => `${e.loc ? e.loc.join('.') + ': ' : ''}${e.msg}`)
          .join(' | ');
      } else {
        errorDetail = JSON.stringify(errorJson.detail);
      }
    } else if (errorJson.error) {
      errorDetail = errorJson.error;
    } else if (errorJson.message) {
      errorDetail = errorJson.message;
    }
  } catch {
    // Body not JSON
  }
  return errorDetail;
}

/** Resolves after `ms`, or rejects early if `signal` aborts. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Scan was cancelled.'));
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Executes a full manuscript scan via the live FastAPI backend.
 *
 * Runs as an asynchronous job: POSTs to `/api/scans/start` (which returns
 * immediately with an analysis_run_id) and then polls
 * `GET /api/scans/{id}` until the pipeline finishes.
 *
 * A scan can take minutes, which is longer than the request timeout of the
 * dev tunnel relay and of most production proxies (Render/Vercel cap around
 * 30-60s). Keeping every individual HTTP request short is what stops those
 * intermediaries returning 504 mid-scan. Because the browser reports such a
 * 504 as a CORS failure (the proxy's own error page carries no
 * Access-Control-Allow-Origin header), that timeout used to surface as a
 * misleading "blocked by CORS policy" message.
 *
 * The signature and return value are unchanged from the previous synchronous
 * implementation, so callers need no modification. `timeoutMs` now bounds the
 * whole job rather than a single request, hence the larger default.
 */
export async function executeManuscriptScan(
  payload: ScanRequest,
  options?: ScanOptions
): Promise<ScanResponse> {
  const timeoutMs = options?.timeoutMs ?? 900000; // 15 min ceiling for the whole job
  const deadline = Date.now() + timeoutMs;
  const signal = options?.signal;

  // ---- 1. Start the job (short request, safe through any proxy) ----------
  let startResponse: Response;
  try {
    startResponse = await fetch(`${API_BASE_URL}/api/scans/start`, {
      method: 'POST',
      headers: await authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
      signal,
    });
  } catch (netErr: any) {
    if (netErr?.name === 'AbortError' || signal?.aborted) {
      throw new Error('Scan was cancelled.');
    }
    const errorMsg = netErr?.message || 'Network error';
    throw new Error(
      `Could not connect to FastAPI backend at ${API_BASE_URL}. Please ensure the backend server is running on port 8000. (${errorMsg})`
    );
  }

  if (startResponse.status === 404) {
    throw new Error(
      `This backend does not expose POST /api/scans/start. Restart the FastAPI server so it picks up the async scan endpoints.`
    );
  }
  if (startResponse.status === 402) {
    let balance = 0;
    try {
      const body = await startResponse.json();
      balance = body?.detail?.balance ?? 0;
    } catch {
      // ignore — default to 0
    }
    throw new InsufficientCreditsError(balance);
  }
  if (!startResponse.ok) {
    throw new Error(await extractErrorDetail(startResponse));
  }

  const { analysis_run_id: analysisRunId } = await startResponse.json();
  if (!analysisRunId) {
    throw new Error('Backend accepted the scan but returned no analysis_run_id.');
  }

  // ---- 2. Poll until the job reaches a terminal state --------------------
  let consecutiveFailures = 0;

  while (true) {
    if (Date.now() > deadline) {
      throw new Error(
        `Scan timed out after ${Math.round(timeoutMs / 1000)}s. The job may still be running on the server (id: ${analysisRunId}).`
      );
    }

    await sleep(POLL_INTERVAL_MS, signal);

    let statusResponse: Response;
    try {
      statusResponse = await fetch(`${API_BASE_URL}/api/scans/${analysisRunId}`, {
        method: 'GET',
        headers: await authHeaders(),
        signal,
      });
    } catch (netErr: any) {
      if (netErr?.name === 'AbortError' || signal?.aborted) {
        throw new Error('Scan was cancelled.');
      }
      // A blip while the job runs shouldn't discard a scan already in
      // progress server-side — retry a few times before surfacing it.
      if (++consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
        throw new Error(
          `Lost connection to the backend while the scan was running (id: ${analysisRunId}). (${netErr?.message || 'Network error'})`
        );
      }
      continue;
    }

    if (!statusResponse.ok) {
      if (++consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
        throw new Error(await extractErrorDetail(statusResponse));
      }
      continue;
    }

    consecutiveFailures = 0;
    const job = await statusResponse.json();

    if (job.status === 'completed' && job.result) {
      return job.result as ScanResponse;
    }
    if (job.status === 'failed') {
      throw new Error(job.error || 'The scan failed on the server.');
    }
    // status === 'processing' → keep polling
  }
}

/**
 * Maps a live FastAPI ScanResponse into the React frontend ScanResult format.
 */
export function mapScanResponseToScanResult(
  response: ScanResponse,
  options?: {
    title?: string;
    customTopic?: string;
    chapterType?: string;
    researchType?: 'quantitative' | 'qualitative';
    styleGuideLink?: string;
    supportingDoc?: string;
  }
): ScanResult {
  const coherence = Math.round(response.overall_coherence_score ?? 0);

  // Map inconsistencies with both new master and legacy UI aliases.
  // coherence_score is nullable: a deterministic numeric-audit finding
  // has no coherence score at all and is always treated as High severity,
  // same as a genuinely severe coherence gap.
  const mappedInconsistencies: Inconsistency[] = (response.inconsistencies || []).map((inc) => ({
    section_a: inc.section_a,
    section_b: inc.section_b,
    coherence_score: inc.coherence_score,
    explanation_what: inc.explanation_what,
    explanation_why: inc.explanation_why,
    suggested_fix: inc.suggested_fix,
    inconsistency_id: inc.inconsistency_id,
    evidence_a: inc.evidence_a,
    evidence_b: inc.evidence_b,
    evidence_verified: inc.evidence_verified,
    objectives_unaddressed: inc.objectives_unaddressed,
    finding_status: inc.finding_status as any,
    // Legacy UI field aliases:
    sectionA: inc.section_a,
    sectionB: inc.section_b,
    description: inc.explanation_what,
    howToFix: inc.suggested_fix,
    severity:
      inc.coherence_score == null || inc.coherence_score < 50 ? 'High'
      : inc.coherence_score < 70 ? 'Medium'
      : 'Low',
    inconsistencyType: 'contradiction',
  }));

  const mappedVerifications: Verification[] = (response.verifications || []).map((v) => ({
    role_a: v.role_a,
    role_b: v.role_b,
    score: v.score,
    alignment: v.alignment as any,
    note: v.note,
  }));

  // Legacy UI status/explanation, driven by the full citation_status
  // ladder rather than the collapsed accessible/broken boolean -- a
  // no-link reference is not "verified accessible", it just never
  // claimed to have a link.
  const legacyCitationStatus = (status?: string): { status: CitedReference['status']; explanation: string } => {
    switch (status) {
      case 'verified_metadata':
      case 'accessible':
        return { status: 'Accessible', explanation: 'Verified accessible reference URL.' };
      case 'no_link':
        return { status: 'Missing Context', explanation: 'No link or DOI supplied for this reference.' };
      case 'bot_wall':
        return { status: 'Unresolved', explanation: 'Publisher blocked automated verification.' };
      case 'metadata_mismatch':
        return { status: 'Unresolved', explanation: 'DOI resolves, but the title/year disagree with this entry.' };
      case 'broken':
      case 'unknown_error':
      default:
        return { status: 'Broken Link', explanation: 'Unreachable or broken reference link (HTTP verification failed).' };
    }
  };

  // Map citations with both new master and legacy UI aliases
  const mappedCitations: CitedReference[] = (response.citations || []).map((cit) => {
    const legacy = legacyCitationStatus(cit.citation_status);
    return {
      citation_raw_reference_text: cit.citation_raw_reference_text,
      citation_is_accessible: cit.citation_is_accessible,
      citation_status: cit.citation_status as any,
      citation_primary_link: cit.citation_primary_link,
      citation_authors_parsed: cit.citation_authors_parsed,
      citation_year_parsed: cit.citation_year_parsed,
      citation_crossref_title: cit.citation_crossref_title,
      citation_title_match_score: cit.citation_title_match_score,
      citation_is_cited_in_text: cit.citation_is_cited_in_text,
      // Legacy UI field aliases:
      citation: cit.citation_raw_reference_text,
      status: legacy.status,
      explanation: legacy.explanation,
    };
  });

  // Build suggestions from inconsistencies
  const mappedSuggestions: Suggestion[] = (response.inconsistencies || []).map((inc) => ({
    category: 'Structure',
    issue: `Coherence Gap: ${inc.section_a} ↔ ${inc.section_b}`,
    explanation: inc.explanation_why || inc.explanation_what || 'Inconsistent section content.',
    remedy: inc.suggested_fix || 'Harmonize section statements across the manuscript.',
  }));

  const derivedTitle =
    options?.customTopic?.trim() ||
    options?.title?.trim() ||
    `Manuscript Scan (${response.doc_url ? response.doc_url.slice(0, 40) + '...' : 'Live Draft'})`;

  return {
    id: response.analysis_run_id || 'scan_' + Date.now().toString(36),
    userId: response.user_id,
    title: derivedTitle,
    documentLink: response.doc_url,
    chapterType: options?.chapterType || 'Full Manuscript',
    overall_coherence_score: response.overall_coherence_score,
    coherenceScore: coherence,
    overallAssessment:
      response.missing_sections && response.missing_sections.length > 0
        ? `Scan completed with overall coherence score of ${coherence}/100. Missing mandatory sections detected: ${response.missing_sections.join(', ')}.`
        : `Scan completed successfully with overall coherence score of ${coherence}/100 across ${response.sections_analyzed?.length || 0} analyzed sections.`,
    inconsistencies: mappedInconsistencies,
    correlationReport: mappedInconsistencies,
    citations: mappedCitations,
    references: mappedCitations,
    section_scores: response.section_scores as any || [],
    verifications: mappedVerifications,
    suggestions: mappedSuggestions,
    timestamp: new Date().toISOString(),
    supportingDoc: options?.supportingDoc || '',
    styleGuideLink: options?.styleGuideLink || '',
    missing_sections: response.missing_sections || [],
    missingSections: response.missing_sections || [],
    sections_analyzed: response.sections_analyzed || [],
    has_all_required_sections: response.has_all_required_sections,
    auto_detected: response.auto_detected,
    detection_confidence: response.detection_confidence,
    score_breakdown: response.score_breakdown as any,
    ai_text_indicator: response.ai_text_indicator as any,
    researchType: options?.researchType || 'quantitative',
    analysis_run_id: response.analysis_run_id,
    status: response.status,
  };
}

// ---------------------------------------------------------------------------
// Credits API — pay-per-scan ledger
// ---------------------------------------------------------------------------

export interface CreditBalanceResponse {
  user_id: string;
  balance: number;
}

export interface CheckoutResponse {
  pymt_txn_id: string;
  checkout_reference: string;
  amount: number;
  credit_amount: number;
}

export interface ConfirmCheckoutResponse {
  status: string;
  balance: number;
}

export interface CreditLedgerEntry {
  ledger_id: string;
  kind: 'grant' | 'purchase' | 'debit' | 'refund';
  delta: number;
  balance_after: number;
  analysis_run_id?: string;
  note?: string;
  created_at: string;
}

export interface CreditHistoryResponse {
  user_id: string;
  entries: CreditLedgerEntry[];
}

function creditHeaders(userId: string, authorization: HeadersInit): HeadersInit {
  return { 'Content-Type': 'application/json', 'X-User-Id': userId, ...authorization };
}

export async function getCreditBalance(userId: string): Promise<CreditBalanceResponse> {
  const resp = await fetch(`${API_BASE_URL}/api/credits/balance`, {
    headers: creditHeaders(userId, await authHeaders()),
  });
  if (!resp.ok) throw new Error(await extractErrorDetail(resp));
  return resp.json();
}

export async function createCreditCheckout(userId: string, creditAmount: number): Promise<CheckoutResponse> {
  const resp = await fetch(`${API_BASE_URL}/api/credits/checkout`, {
    method: 'POST',
    headers: creditHeaders(userId, await authHeaders()),
    body: JSON.stringify({ credit_amount: creditAmount }),
  });
  if (!resp.ok) throw new Error(await extractErrorDetail(resp));
  return resp.json();
}

export async function confirmCreditCheckout(userId: string, pymtTxnId: string): Promise<ConfirmCheckoutResponse> {
  const resp = await fetch(`${API_BASE_URL}/api/credits/confirm`, {
    method: 'POST',
    headers: creditHeaders(userId, await authHeaders()),
    body: JSON.stringify({ pymt_txn_id: pymtTxnId }),
  });
  if (!resp.ok) throw new Error(await extractErrorDetail(resp));
  return resp.json();
}

export async function getCreditHistory(userId: string, limit = 50): Promise<CreditHistoryResponse> {
  const resp = await fetch(`${API_BASE_URL}/api/credits/history?limit=${limit}`, {
    headers: creditHeaders(userId, await authHeaders()),
  });
  if (!resp.ok) throw new Error(await extractErrorDetail(resp));
  return resp.json();
}
