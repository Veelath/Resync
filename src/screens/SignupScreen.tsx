import { useState, useId, useEffect, useRef } from "react";
import type React from 'react';
import { Spinner, Eye, GIcon } from '../components/AppPrimitives';
import { AuthShell } from '../components/AuthShell';
import { PasswordRequirements, isPasswordValid } from '../components/PasswordRequirements';
import type { Screen } from '../lib/appTypes';
import { B } from '../lib/brand';
import { supabase } from '../lib/supabase';
import { cleanNameInput, emailError, mailDomainAccepts, nameError } from '../lib/validation';
import { modalTabTarget } from '../lib/modalFocus';

const MAIL_ICON = (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7l8.5 6 8.5-6" /></svg>
);

const LOCK_ICON = (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
);

const USER_ICON = (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4.5 20c1-3.6 4-5.5 7.5-5.5s6.5 1.9 7.5 5.5" /></svg>
);

function FieldInput({ label, type = "text", value, onChange, placeholder, icon, required = true, error = "", onBlur, autoComplete }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder: string; icon?: React.ReactNode; required?: boolean;
  /** Shown under the field; empty means the value is fine. */
  error?: string; onBlur?: () => void; autoComplete?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="auth-label">{label}</label>
      <div className="auth-field">
        {icon && <span className="auth-field-icon" aria-hidden="true">{icon}</span>}
        <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} required={required}
          autoComplete={autoComplete} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
          className={icon ? "auth-input auth-input--icon" : "auth-input"} style={error ? { borderColor: "#e11d48" } : undefined} />
      </div>
      {error && <p id={`${id}-error`} role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export function SignupScreen({ onNavigate, onBack, onSignupSuccess }: { onNavigate: (s: Screen) => void; onBack: () => void; onSignupSuccess?: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pw2, setPw2] = useState("");
  const [pw2Touched, setPw2Touched] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // After the account is created, the person must type the 6-digit code that was emailed to them.
  const [codeStep, setCodeStep] = useState(false);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);
  const legalDialog = useRef<HTMLDivElement>(null);
  const legalOpener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!legalModal) return;
    const dialog = legalDialog.current;
    if (!dialog) return;
    const opener = legalOpener.current;
    dialog.querySelector<HTMLElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setLegalModal(null); return; }
      if (event.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(item => item.getClientRects().length > 0);
      const target = modalTabTarget(items.indexOf(document.activeElement as HTMLElement), items.length, event.shiftKey);
      if (target !== null) { event.preventDefault(); (target < 0 ? dialog : items[target]).focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus(); };
  }, [legalModal]);

  // A field shows its problem once it has been left, or after a submit attempt.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (field: string) => setTouched(current => ({ ...current, [field]: true }));
  // Whether the part after the @ can receive mail at all (a made-up domain cannot).
  const [domainBad, setDomainBad] = useState("");
  useEffect(() => {
    const value = email.trim().toLowerCase();
    if (emailError(value)) { setDomainBad(""); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      mailDomainAccepts(value).then(ok => { if (!cancelled) setDomainBad(ok ? "" : "This email domain does not exist or cannot receive email. Check the spelling."); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [email]);
  const errors = { first: nameError(firstName, "First name"), middle: nameError(middleName, "Middle name", false), last: nameError(lastName, "Last name"), email: emailError(email) || domainBad };
  const shown = (field: keyof typeof errors) => touched[field] ? errors[field] : "";
  const canSubmit = !Object.values(errors).some(Boolean) && isPasswordValid(pw) && pw2 === pw && agreed && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ first: true, middle: true, last: true, email: true });
    setPw2Touched(true);
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    const trimmedFirst = firstName.trim();
    const trimmedMiddle = middleName.trim();
    const trimmedLast = lastName.trim();
    const full_name = [trimmedFirst, trimmedMiddle, trimmedLast].filter(Boolean).join(" ").trim();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: pw,
      options: {
        data: {
          first_name: trimmedFirst,
          middle_name: trimmedMiddle,
          last_name: trimmedLast,
          full_name,
        },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      // Supabase hides whether an address is taken by returning a user with no identities.
      setError("This email is already registered. Try signing in instead.");
    } else if (data.session) {
      // The project is not asking for email confirmation, so there is nothing to verify.
      onSignupSuccess?.();
    } else {
      setCodeStep(true);
      setNotice(`We sent a 6-digit code to ${email.trim().toLowerCase()}.`);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6 || loading) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: "signup" });
    setLoading(false);
    if (error) setError("That code is wrong or has expired. Check your email or ask for a new one.");
    else onSignupSuccess?.();
  }

  // Wrong or inactive address: go back to the form with everything still filled in, change the email, and a fresh code goes there.
  function useDifferentEmail() {
    setCodeStep(false);
    setCode("");
    setError("");
    setNotice("");
    setTouched(current => ({ ...current, email: true }));
  }

  const [resendWait, setResendWait] = useState(0);
  useEffect(() => {
    if (resendWait <= 0) return;
    const timer = setTimeout(() => setResendWait(resendWait - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendWait]);

  async function resendCode() {
    if (resendWait > 0) return;
    setResendWait(45);
    setError("");
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase() });
    if (error) setError(error.message);
    else setNotice("A new code is on its way. Check your inbox and spam folder.");
  }

  return (
    <AuthShell onNavigate={onNavigate} onBack={onBack}>
      <div>
        <div className="auth-rise mb-6">
          <p className="text-xs font-bold tracking-[0.16em] uppercase mb-3" style={{ color: B }}>New account</p>
          <h1 className="text-3xl lg:text-[42px] font-extrabold text-[#0b0f3d] tracking-[-0.035em] leading-[1.05] mb-2">Create your account</h1>
          <p className="text-[15px] text-[#4b5275] leading-relaxed">Free to use — no credit card required.</p>
        </div>

        {codeStep ? (
          <form onSubmit={verifyCode} noValidate className="space-y-4">
            <p className="text-[15px] text-[#4b5275] leading-relaxed">{notice} Enter it below to confirm the address is yours.</p>
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100" role="alert">{error}</div>}
            <div className="space-y-2">
              <label htmlFor="signup-code" className="auth-label">Verification code</label>
              <input id="signup-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} placeholder="123456"
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="auth-input" style={{ letterSpacing: "0.4em" }} />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <button type="submit" disabled={code.length < 6 || loading} className="auth-primary auth-focus" style={{ width: "auto", padding: "0 30px" }}>
                {loading ? <><Spinner />Verifying…</> : "Verify and continue"}
              </button>
              <button type="button" onClick={resendCode} disabled={resendWait > 0} className="auth-link auth-focus px-1" style={resendWait > 0 ? { opacity: 0.55 } : undefined}>{resendWait > 0 ? `Send a new code (${resendWait}s)` : "Send a new code"}</button>
            </div>
            <div className="rounded-xl bg-[#f6f7ff] px-4 py-3 text-sm leading-relaxed text-[#4b5275]">
              <p className="font-semibold text-[#0b0f3d]">Didn’t get the code?</p>
              <ul className="mt-1 list-disc pl-5">
                <li>Check your Spam or Junk folder, and wait a minute.</li>
                <li>Make sure <strong>{email.trim().toLowerCase()}</strong> is spelled right and the mailbox is active.</li>
              </ul>
              <button type="button" onClick={useDifferentEmail} className="auth-link auth-focus mt-2 px-0">Use a different email address</button>
            </div>
          </form>
        ) : (<>
        <button
          type="button"
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
          className="auth-google auth-focus auth-rise mb-6"
        >
          <GIcon />Continue with Google
        </button>

        <div className="auth-or auth-rise mb-6">
          <span>or register with email</span>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100" role="alert">{error}</div>}

        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput label="First name" value={firstName} onChange={value => setFirstName(cleanNameInput(value))} onBlur={() => touch("first")} error={shown("first")} autoComplete="given-name" placeholder="Maria" required={true} icon={USER_ICON} />
            <FieldInput label="Middle name (optional)" value={middleName} onChange={value => setMiddleName(cleanNameInput(value))} onBlur={() => touch("middle")} error={shown("middle")} autoComplete="additional-name" placeholder="Clara" required={false} icon={USER_ICON} />
          </div>
          <FieldInput label="Last name" value={lastName} onChange={value => setLastName(cleanNameInput(value))} onBlur={() => touch("last")} error={shown("last")} autoComplete="family-name" placeholder="Santos" required={true} icon={USER_ICON} />
          <FieldInput label="Email address" type="email" value={email} onChange={setEmail} onBlur={() => touch("email")} error={shown("email")} autoComplete="email" placeholder="maria.santos@dlsu.edu.ph" icon={MAIL_ICON} />

          {/* password */}
          <div className="space-y-2">
            <label htmlFor="signup-password-input" className="auth-label">Password</label>
            <div className="auth-field">
              <span className="auth-field-icon" aria-hidden="true">{LOCK_ICON}</span>
              <input id="signup-password-input" type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" required
                aria-describedby="signup-password-requirements" autoComplete="new-password"
                className="auth-input auth-input--icon auth-input--toggle" />
              <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(!showPw)} className="auth-eye auth-focus">
                <Eye open={showPw} />
              </button>
            </div>
          </div>

          {/* confirm password: always visible */}
          {(
            <div className="space-y-2">
              <label htmlFor="signup-confirm-input" className="auth-label">Confirm password</label>
              <div className="auth-field">
                <span className="auth-field-icon" aria-hidden="true">{LOCK_ICON}</span>
                <input id="signup-confirm-input" type={showPw ? "text" : "password"} value={pw2} onChange={e => setPw2(e.target.value)}
                  onBlur={() => setPw2Touched(true)} placeholder="Re-enter your password" required autoComplete="new-password"
                  aria-invalid={pw2Touched && pw2 !== pw} className="auth-input auth-input--icon"
                  style={pw2Touched && pw2 !== pw ? { borderColor: "#e11d48" } : undefined} />
              </div>
              {pw2Touched && pw2 !== pw && <p role="alert" className="text-xs font-semibold text-rose-600">Passwords do not match.</p>}
            </div>
          )}

          {/* the rules stay hidden until the person starts typing a password */}
          {pw && <PasswordRequirements id="signup-password-requirements" password={pw} />}

          {/* terms */}
          <div className="flex items-start gap-3 w-full text-left select-none pt-1">
            <button
              type="button"
              role="checkbox"
              aria-checked={agreed}
              onClick={() => setAgreed(!agreed)}
              className="auth-focus mt-0.5 w-[22px] h-[22px] min-w-[22px] border-[1.5px] flex items-center justify-center transition-all shrink-0 cursor-pointer"
              style={{ background: agreed ? B : "white", borderColor: agreed ? B : "#c4c8e6", borderRadius: 7 }}
              aria-label="Agree to terms of service and privacy policy"
            >
              {agreed && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" className="w-2.5 h-2.5" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>}
            </button>
            <span className="text-sm text-[#4b5275] leading-relaxed">
              I agree to the{" "}
              <button
                type="button"
                onClick={event => { legalOpener.current = event.currentTarget; setLegalModal("terms"); }}
                className="auth-link auth-focus px-0.5 cursor-pointer"
              >
                Terms of Service
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={event => { legalOpener.current = event.currentTarget; setLegalModal("privacy"); }}
                className="auth-link auth-focus px-0.5 cursor-pointer"
              >
                Privacy Policy
              </button>
            </span>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-4">
            <button type="submit" disabled={!canSubmit} className="auth-primary auth-focus" style={{ width: "auto", padding: "0 30px" }}>
              {loading ? <><Spinner />Creating account…</> : <>Create account<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg></>}
            </button>
            <p className="text-sm text-[#4b5275]">
              Have an account?{" "}
              <button type="button" onClick={() => onNavigate("login")} className="auth-link auth-focus px-1">Sign in</button>
            </p>
          </div>
        </form>
        </>)}

        {legalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div ref={legalDialog} role="dialog" aria-modal="true" aria-labelledby="signup-legal-title" tabIndex={-1} className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 id="signup-legal-title" className="text-base font-bold text-gray-900">
                    {legalModal === "terms" ? "Terms of Service" : "Privacy Policy"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Last updated: {legalModal === "terms" ? "October 2026" : "November 9, 2026"}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setLegalModal(null)}
                  className="auth-focus w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4" aria-hidden="true">
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
                      You retain all ownership, copyright, and intellectual property rights in and to your uploaded manuscripts and research materials. Resync does not claim any ownership over your manuscripts. You represent that you have all necessary rights to submit manuscripts for coherence and citation analysis.
                    </p>
                    <h4 className="font-bold text-gray-800 text-sm">2. Use of Analysis Tools</h4>
                    <p>
                      Resync provides holistic manuscript analysis, citation accessibility scanning, and an AI-text indicator. Analysis results and recommendations are advisory tools intended to assist scholarly writing and revision, and should be evaluated in accordance with your institution's academic guidelines.
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
                      We collect account information (such as your name and email address) and document content that you submit solely to perform manuscript coherence and citation analysis.
                    </p>
                    <h4 className="font-bold text-gray-800 text-sm">2. Manuscript Confidentiality & Data Protection</h4>
                    <p>
                      Manuscript text is sent to Google Gemini to produce findings and recommendations. During user testing, Gemini runs on Google's free tier, where Google may use submitted content to improve its products. We do not sell manuscripts.
                    </p>
                    <h4 className="font-bold text-gray-800 text-sm">3. Data Retention & Deletion</h4>
                    <p>
                      Extracted manuscript text and scan results are stored to support your reports. The app does not currently provide a control to delete individual scans or accounts.
                    </p>
                  </>
                )}
              </div>
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setLegalModal(null)}
                  className="auth-focus px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  style={{ background: B, color: "white" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
