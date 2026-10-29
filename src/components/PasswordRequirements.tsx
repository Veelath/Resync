import { B } from '../lib/brand';

export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
  { id: 'lowercase', label: 'At least 1 lowercase letter', test: (pw: string) => /[a-z]/.test(pw) },
  { id: 'uppercase', label: 'At least 1 uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
  { id: 'number-or-symbol', label: 'At least 1 number or special character', test: (pw: string) => /[0-9]|[^A-Za-z0-9]/.test(pw) },
];

export function isPasswordValid(pw: string) {
  return PASSWORD_RULES.every(rule => rule.test(pw));
}

// Each row shows its state with the icon shape as well as the colour: a hollow ring is unmet, a filled tick is met.
export function PasswordRequirements({ id, password }: { id: string; password: string }) {
  const results = PASSWORD_RULES.map(rule => ({ ...rule, met: rule.test(password) }));
  const metCount = results.filter(rule => rule.met).length;

  return (
    <div id={id} className="rounded-xl bg-[#f6f7ff] px-4 py-3">
      <p className="text-xs font-semibold text-gray-600 mb-2">New password must contain:</p>
      <ul className="space-y-1.5">
        {results.map(rule => (
          <li key={rule.id} data-met={rule.met} className="flex items-center gap-2.5 text-xs" style={{ color: rule.met ? '#0b0f3d' : '#6b7280' }}>
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border"
              style={{ background: rule.met ? B : '#ffffff', borderColor: rule.met ? B : '#c7cbe6' }}
              aria-hidden="true"
            >
              {rule.met && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" className="w-2.5 h-2.5"><path d="M5 12l5 5L20 7" /></svg>}
            </span>
            <span className={rule.met ? 'font-semibold' : ''}>{rule.label}</span>
            <span className="sr-only">{rule.met ? ' (met)' : ' (not met)'}</span>
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">{metCount} of {PASSWORD_RULES.length} password requirements met</p>
    </div>
  );
}
