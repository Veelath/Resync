export function limitErrorMessage(body: unknown): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const value = record.detail ?? record.message ?? record.error;
    if (typeof value === 'string' && value.trim() && !/[{}<>]/.test(value)) return value.trim();
  }
  return 'We could not start this scan. Please try again.';
}
