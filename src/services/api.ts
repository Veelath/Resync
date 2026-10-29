/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

/** Consecutive poll failures tolerated before giving up on a running job.
 * 12 * 2.5s = 30s -- enough to ride out a Render container restart, which
 * the previous 10s budget was too thin to survive. */
const MAX_CONSECUTIVE_POLL_FAILURES = 12;

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
): Promise<ScanResult> {
  const timeoutMs = options?.timeoutMs ?? 900000; // 15 min ceiling for the whole job
  const deadline = Date.now() + timeoutMs;
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
      return adaptScanResult(job.result);
    }
    if (job.status === 'failed') {
      throw new Error(job.error || 'The scan failed on the server.');
    }
    // status === 'processing' → keep polling
  }
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
