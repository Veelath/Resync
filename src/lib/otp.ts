// The emailed confirmation code. Supabase lets a project choose its length (6 to 10 digits; this project's emails carry 8), so the
// form accepts any length in that range instead of assuming one. Pasted text with spaces or dashes ("1234 5678") is cleaned.
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 10;

export function cleanCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, OTP_MAX_LENGTH);
}

export function codeReady(code: string): boolean {
  return code.length >= OTP_MIN_LENGTH && code.length <= OTP_MAX_LENGTH;
}
