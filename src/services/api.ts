/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { backoffMs, waitState, notFoundIsFinal, safeScanMessage, MAX_POLL_MS, RECONNECT_MESSAGE, UNREACHABLE_MESSAGE, CEILING_MESSAGE, NOT_FOUND_MESSAGE } from '../lib/scanWait';
import { supabase } from '../lib/supabase.js';
import { adaptScanResult, type ScanResult } from './v7Result';

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
  manuscript_id?: string;
  manuscript_title?: string;
  doc_url?: string;
  file?: File;
  template_toc?: string[];
  style_reference_url?: string;
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

export interface AITextIndicatorResponse {
  overall_score?: number | null;
  section_scores?: Record<string, number | null>;
  flagged_sections?: string[];
  disclaimer?: string;
}

export interface ScanOptions {
  signal?: AbortSignal;
  startedAt?: number;
  /** Called once the server has accepted the scan, so it can be found again after a page refresh. */
  onStarted?: (analysisRunId: string) => void;
  onProcessing?: () => void;
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

/** A notice the backend attaches while a scan runs, e.g. when the AI rate limit makes it wait. */
export interface ScanStatusNotice {
  message: string;
  level: 'info' | 'wait';
  queued: boolean;
  queuePosition: number | null;
  estimatedWaitSeconds: number | null;
  elapsedSeconds?: number | null;
  reconnecting?: boolean;
  info?: string;
  failure?: { message: string; kind?: string; scanId: string };
}

let currentScanStatus: ScanStatusNotice | null = null;
const scanStatusListeners = new Set<() => void>();

function setScanStatus(next: ScanStatusNotice | null) {
  currentScanStatus = next;
  scanStatusListeners.forEach(listener => listener());
}

export function getScanStatus(): ScanStatusNotice | null {
  return currentScanStatus;
}

export function subscribeScanStatus(listener: () => void): () => void {
  scanStatusListeners.add(listener);
  return () => scanStatusListeners.delete(listener);
}

/** Reads queue and status fields defensively; both are absent on older backends. */
function readScanStatus(job: unknown): ScanStatusNotice | null {
  if (!job || typeof job !== 'object') return null;
  const record = job as Record<string, unknown>;
  const message = typeof record.status_message === 'string' ? record.status_message.trim() : '';
  const queuePosition = typeof record.queue_position === 'number' && Number.isInteger(record.queue_position) && record.queue_position >= 1
    ? record.queue_position
    : null;
  const estimatedWaitSeconds = typeof record.estimated_wait_seconds === 'number' && Number.isFinite(record.estimated_wait_seconds) && record.estimated_wait_seconds >= 0
    ? record.estimated_wait_seconds
    : null;
  const queued = queuePosition !== null;

  return {
    message: safeScanMessage(message),
    elapsedSeconds: typeof record.elapsed_seconds === 'number' ? record.elapsed_seconds : null,
    level: record.status_message_level === 'wait' ? 'wait' : 'info',
    queued,
    queuePosition,
    estimatedWaitSeconds,
  };
}

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
 * implementation, so callers need no modification.
 */
export async function executeManuscriptScan(
  payload: ScanRequest,
  options?: ScanOptions
): Promise<ScanResult> {
  setScanStatus(null);
  return runManuscriptScan(payload, options);
}

async function runManuscriptScan(
  payload: ScanRequest,
  options?: ScanOptions
): Promise<ScanResult> {
  const signal = options?.signal;

  // ---- 1. Start the job (short request, safe through any proxy) ----------
  let startResponse: Response;
  try {
    if (payload.file) {
      const formData = new FormData();
      formData.append('file', payload.file);
      formData.append('user_id', payload.user_id);
      if (payload.manuscript_title) {
        formData.append('manuscript_title', payload.manuscript_title);
      }
      if (payload.manuscript_id) {
        formData.append('manuscript_id', payload.manuscript_id);
      }
      if (payload.template_toc && payload.template_toc.length > 0) {
        formData.append('template_toc', JSON.stringify(payload.template_toc));
      }
      if (payload.style_reference_url) {
        formData.append('style_reference_url', payload.style_reference_url);
      }

      startResponse = await fetch(`${API_BASE_URL}/api/scans/upload`, {
        method: 'POST',
        headers: await authHeaders(),
        body: formData,
        signal,
      });
    } else {
      const jsonPayload = {
        user_id: payload.user_id,
        manuscript_id: payload.manuscript_id,
        manuscript_title: payload.manuscript_title,
        doc_url: payload.doc_url,
        template_toc: payload.template_toc,
        style_reference_url: payload.style_reference_url,
      };

      startResponse = await fetch(`${API_BASE_URL}/api/scans/start`, {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(jsonPayload),
        signal,
      });
    }
  } catch (netErr: any) {
    if (netErr?.name === 'AbortError' || signal?.aborted) {
      throw new Error('Scan was cancelled.');
    }
    const errorMsg = netErr?.message || 'Network error';
    throw new Error(
      `Could not connect to FastAPI backend at ${API_BASE_URL}. (${errorMsg})`
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

  options?.onStarted?.(analysisRunId);
  return pollScanJob(analysisRunId, signal, Date.now());
}

export class ScanOutcome extends Error {
  constructor(message: string, public scanId: string, public kind: string, public failureKind?: string) { super(message); }
}

/** Follow an accepted job without treating a lost connection as a failed scan. */
async function pollScanJob(id: string, signal: AbortSignal | undefined, startedAt: number, onProcessing?: () => void): Promise<ScanResult> {
  let failures = 0;
  let unreachableSince: number | null = null;
  let delay = 0;
  let lastStatus: ScanStatusNotice = { message: '', level: 'info', queued: false, queuePosition: null, estimatedWaitSeconds: null };
  while (true) {
    if (waitState(Date.now(), startedAt, unreachableSince) === 'ceiling') throw new ScanOutcome(CEILING_MESSAGE, id, 'info');
    if (delay) await sleep(Math.min(delay, Math.max(0, startedAt + MAX_POLL_MS - Date.now())), signal);
    if (Date.now() - startedAt >= MAX_POLL_MS) throw new ScanOutcome(CEILING_MESSAGE, id, 'info');
    const requestStartedAt = Date.now();
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timer = setTimeout(abort, Math.min(20000, Math.max(0, startedAt + MAX_POLL_MS - Date.now())));
    let response: Response | undefined;
    let job: any;
    try {
      response = await fetch(`${API_BASE_URL}/api/scans/${encodeURIComponent(id)}`, { headers: await authHeaders(), signal: controller.signal });
      if (response.ok) job = await response.json();
    } catch {
      response = undefined;
      if (signal?.aborted) throw new Error('Scan was cancelled.');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
    if (response?.status === 404) {
      if (notFoundIsFinal(Date.now(), startedAt)) throw new ScanOutcome(NOT_FOUND_MESSAGE, id, 'info');
      failures = 0; unreachableSince = null; delay = 5000;
      onProcessing?.(); onProcessing = undefined;
      setScanStatus({ ...lastStatus, reconnecting: false, info: undefined });
      continue;
    }
    if (!response || response.status === 429 || response.status >= 500) {
      unreachableSince ??= requestStartedAt;
      delay = backoffMs(++failures);
      onProcessing?.(); onProcessing = undefined;
      setScanStatus({ ...lastStatus, reconnecting: true, info: waitState(Date.now(), startedAt, unreachableSince) === 'unreachable' ? UNREACHABLE_MESSAGE : undefined });
      continue;
    }
    if (!response.ok) throw new ScanOutcome('We cannot confirm this scan. Please check your dashboard again.', id, 'info');
    failures = 0; unreachableSince = null; delay = 5000;
    if (job.status === 'completed' && job.result) return adaptScanResult(job.result);
    if (job.status === 'failed') {
      const raw = typeof job.error === 'string' ? job.error : '';
      const message = safeScanMessage(raw);
      throw new ScanOutcome(message || 'We could not finish this scan. Please try again.', id, 'failed', job.failure_kind);
    }
    onProcessing?.(); onProcessing = undefined;
    lastStatus = readScanStatus(job) ?? lastStatus;
    setScanStatus(lastStatus);
  }
}

export async function resumeManuscriptScan(analysisRunId: string, options?: ScanOptions): Promise<ScanResult> {
  setScanStatus(null);
  return pollScanJob(analysisRunId, options?.signal, options?.startedAt ?? Date.now(), options?.onProcessing);
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

export async function unlockScan(analysisRunId: string): Promise<{ unlocked: true; charged: boolean; credits_remaining: number | null }> {
  const response = await fetch(`${API_BASE_URL}/api/scans/${encodeURIComponent(analysisRunId)}/unlock`, {
    method: 'POST', headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await extractErrorDetail(response));
  return response.json();
}

export async function getScanResult(analysisRunId: string): Promise<ScanResult> {
  const response = await fetch(`${API_BASE_URL}/api/scans/${encodeURIComponent(analysisRunId)}`, { headers: await authHeaders() });
  if (!response.ok) throw new Error(await extractErrorDetail(response));
  const body = await response.json();
  if (body.status !== 'completed' || !body.result) throw new Error('The full report is not ready. Refresh and try again.');
  return adaptScanResult(body.result);
}

export async function createCreditCheckout(
  userId: string,
  creditAmount: number,
  unitPrice?: number,
): Promise<CheckoutResponse> {
  const resp = await fetch(`${API_BASE_URL}/api/credits/checkout`, {
    method: 'POST',
    headers: creditHeaders(userId, await authHeaders()),
    body: JSON.stringify({
      credit_amount: creditAmount,
      ...(unitPrice !== undefined ? { unit_price: unitPrice } : {}),
    }),
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

export interface ManuscriptOutline {
  title: string; words: number; pages: number; structure: 'headings' | 'structure' | 'split';
  sections: { name: string; words: number; role?: string | null }[]; excerpt: string[];
  /** False when the document has no research-paper structure; paper_problem says why, in words for the student. */
  looks_like_paper?: boolean; paper_problem?: string | null;
}

/** The sections a scan would compare, read before the scan so the person can check the paper is the right one. */
export async function getManuscriptOutline(source: { file: File } | { docUrl: string }): Promise<ManuscriptOutline> {
  const form = new FormData();
  if ('file' in source) form.append('file', source.file); else form.append('doc_url', source.docUrl);
  const resp = await fetch(`${API_BASE_URL}/api/manuscripts/outline`, { method: 'POST', headers: await authHeaders(), body: form });
  if (!resp.ok) throw new Error(await extractErrorDetail(resp));
  return resp.json();
}

/** A public Google Doc as a Word file, so a link behaves exactly like an uploaded document. */
export async function downloadGoogleDoc(docUrl: string): Promise<File> {
  const form = new FormData();
  form.append('doc_url', docUrl);
  const resp = await fetch(`${API_BASE_URL}/api/manuscripts/google-docx`, { method: 'POST', headers: await authHeaders(), body: form });
  if (!resp.ok) throw new Error(await extractErrorDetail(resp));
  const name = decodeURIComponent(resp.headers.get('X-Doc-Filename') || 'Google Doc.docx');
  return new File([await resp.blob()], name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/** Does this email belong to an account? Forgot password uses it to say "Email not found". */
export async function isEmailRegistered(email: string): Promise<boolean> {
  const resp = await fetch(`${API_BASE_URL}/api/auth/email-registered`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
  });
  if (!resp.ok) throw new Error(await extractErrorDetail(resp));
  return (await resp.json()).registered === true;
}

export interface PurchaseResult {
  pymt_txn_id: string; checkout_reference: string; amount: number; credit_amount: number; balance: number; method: string;
}

/** Buy a credit package: the server records the transaction and adds the credits to the wallet. */
export async function purchaseCredits(
  userId: string, creditAmount: number, method: 'card' | 'gcash' | 'bank_transfer' = 'card',
  proof?: { reference_number: string; payer_name?: string; file_name?: string; content_type: string; proof_data: string },
): Promise<PurchaseResult> {
  const resp = await fetch(`${API_BASE_URL}/api/credits/purchase`, {
    method: 'POST',
    headers: creditHeaders(userId, await authHeaders()),
    body: JSON.stringify({ credit_amount: creditAmount, method, ...(proof ? { proof } : {}) }),
  });
  if (!resp.ok) throw new Error(await extractErrorDetail(resp));
  return resp.json();
}

export interface PaymentProofBody {
  pymt_txn_id: string; method: string; reference_number: string; payer_name: string; file_name: string; content_type: string; proof_data: string;
}

export async function uploadPaymentProof(userId: string, body: PaymentProofBody): Promise<{ status: string; proof_id: string }> {
  const resp = await fetch(`${API_BASE_URL}/api/credits/proof`, {
    method: 'POST',
    headers: creditHeaders(userId, await authHeaders()),
    body: JSON.stringify(body),
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

export interface ManuscriptResponse {
  available: boolean;
  text?: string;
  reason?: string;
  status?: number;
  fetched_at?: string;
}

const MANUSCRIPT_PREVIEW_TIMEOUT_MS = 15_000;

export async function fetchManuscript(analysisRunId: string): Promise<ManuscriptResponse> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const request = (async () => {
      const response = await fetch(`${API_BASE_URL}/api/scans/${analysisRunId}/manuscript`, {
        method: 'GET',
        headers: await authHeaders(),
        signal: controller.signal,
      });

      if (response.status === 400) {
        return { available: false, reason: 'non_gdocs' };
      }

      if (!response.ok) {
        return { available: false, reason: 'http_error', status: response.status };
      }

      return await response.json();
    })();

    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error('manuscript-preview-timeout'));
      }, MANUSCRIPT_PREVIEW_TIMEOUT_MS);
    });

    return await Promise.race([request, timeout]);
  } catch (e) {
    console.error('fetchManuscript failed:', e);
    return {
      available: false,
      reason: e instanceof Error && e.message === 'manuscript-preview-timeout' ? 'timeout' : 'unreachable',
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
