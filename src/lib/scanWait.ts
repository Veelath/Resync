export const MAX_POLL_MS = 3 * 60 * 60 * 1000;
export const UNREACHABLE_MS = 10 * 60 * 1000;
export const NOT_FOUND_GRACE_MS = 60 * 1000;
export const RECONNECT_MESSAGE = 'Trying to reconnect to the server...';
export const UNREACHABLE_MESSAGE = 'We cannot reach the server right now. Your scan may still be running. Check your dashboard again in a few minutes.';
export const CEILING_MESSAGE = 'We cannot confirm this scan. Open your dashboard later or start it again.';
export const NOT_FOUND_MESSAGE = 'We cannot find this scan. Please start it again.';
export const docxMessage = (name: string) => /\.doc$/i.test(name)
  ? 'Old .doc files cannot be read. Open it in Word, choose Save As > Word Document (.docx), then upload it again.'
  : 'Only Word .docx files or a Google Docs link are accepted.';
export const backoffMs = (failures: number) => [5000, 10000, 20000, 30000][Math.min(Math.max(failures - 1, 0), 3)];
export const waitState = (now: number, started: number, unreachableSince: number | null) => now - started >= MAX_POLL_MS ? 'ceiling' : unreachableSince !== null && now - unreachableSince >= UNREACHABLE_MS ? 'unreachable' : 'waiting';
export const notFoundIsFinal = (now: number, started: number) => now - started >= NOT_FOUND_GRACE_MS;
export const isLongRunning = (elapsedMs: number, words?: number | null, serverSeconds?: number | null) => Math.max(elapsedMs, (serverSeconds ?? 0) * 1000) >= (words != null ? 4 * 60000 + words / 5000 * 60000 : 8 * 60000);
export const failureTitle = (kind?: string | null) => ({ interrupted: 'Scan interrupted', timeout: 'Scan stopped', refused: 'Document not accepted', error: 'Scan could not be finished' }[kind ?? ''] ?? 'Scan could not be finished');
export const isDocx = (name: string) => /\.docx$/i.test(name);
export const scanStatusMessage = (message: string) => message.trim() === 'The AI is busy right now, so your scan may take a little longer than usual.' ? '' : safeScanMessage(message);
export const safeScanMessage = (message: string) => {
  const cleaned = message.replace(/ If it keeps happening, tell us this scan number: [^.]+\./i, '');
  const technical = /(?:\b[0-9a-f]{8}-[0-9a-f-]{27,}\b|\b[0-9a-f]{16,}\b|\b(?:traceback|stack\s*trace|exception|error|failed to fetch|networkerror|aborterror|typeerror|referenceerror|syntaxerror|timeout(?:error)?|http|https?|api|backend|server returned|status|code|request|response|endpoint|database|supabase|postgres|sql|json|python|fastapi|socket|connection reset|errno|localhost)\b|\b[45]\d{2}\b|\b\w*(?:exception|error)\b|the job may still be running|[{}\[\]\\]|\b\w+\.py:\d+|\b\w+_\w+\b|https?:\/\/)/i;
  return technical.test(cleaned) ? '' : cleaned;
};
export const shouldNotifyFailure = (notifications: {kind: string; scanId?: string}[], id: string) => !notifications.some(n => n.kind === 'error' && n.scanId === id);
export const canResume = (saved: {id?: string; at?: number; userId?: string} | null, userId: string, now: number) => !!saved?.id && typeof saved.at === 'number' && now - saved.at >= 0 && now - saved.at < MAX_POLL_MS && (!saved.userId || saved.userId === userId);

export async function withRequestTimeout<T>(work: () => Promise<T>, controller: AbortController, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        onAbort = () => reject(new Error('Request cancelled'));
        if (controller.signal.aborted) return onAbort();
        controller.signal.addEventListener('abort', onAbort, { once: true });
        timer = setTimeout(() => controller.abort(), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (onAbort) controller.signal.removeEventListener('abort', onAbort);
  }
}

type NotifiedScan = { userId: string; id: string; at: number };
export function rememberFailureNotification(storage: Pick<Storage, 'getItem' | 'setItem'>, userId: string, id: string, now: number): boolean {
  try {
    const value: unknown = JSON.parse(storage.getItem('resync-notified-scans') || '[]');
    const entries: NotifiedScan[] = (Array.isArray(value) ? value : []).filter((entry): entry is NotifiedScan =>
      typeof entry?.userId === 'string' && typeof entry?.id === 'string' && typeof entry?.at === 'number' &&
      entry.at <= now && now - entry.at < 30 * 24 * 60 * 60 * 1000);
    const found = entries.some(entry => entry.userId === userId && entry.id === id);
    if (!found) entries.push({ userId, id, at: now });
    storage.setItem('resync-notified-scans', JSON.stringify(entries.slice(-200)));
    return !found;
  } catch {
    return true;
  }
}
