import { useState, useId } from "react";
import type React from 'react';
import { Spinner, Eye, GIcon } from '../components/AppPrimitives';
import { AuthShell } from '../components/AuthShell';
import { PasswordRequirements, isPasswordValid } from '../components/PasswordRequirements';
import type { Screen } from '../lib/appTypes';
import { B } from '../lib/brand';
import { supabase } from '../lib/supabase';

function FieldInput({ label, type = "text", value, onChange, placeholder, required = true }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="auth-label">{label}</label>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="auth-input" />
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
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);

  const canSubmit = !!firstName.trim() && !!lastName.trim() && !!email && isPasswordValid(pw) && agreed && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    const trimmedFirst = firstName.trim();
    const trimmedMiddle = middleName.trim();
    const trimmedLast = lastName.trim();
    const full_name = [trimmedFirst, trimmedMiddle, trimmedLast].filter(Boolean).join(" ").trim();

    const { error } = await supabase.auth.signUp({
      email,
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
    } else {
      onSignupSuccess?.();
    }
  }

  return (
    <AuthShell onNavigate={onNavigate} onBack={onBack}>
      <div>
        <div className="auth-rise mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase mb-3" style={{ background: "#eef0ff", color: "#1a1fcc" }}>
            New Account
          </span>
          <h1 className="text-3xl lg:text-[42px] font-extrabold text-[#0b0f3d] tracking-[-0.035em] leading-[1.05] mb-2">Create your account</h1>
          <p className="text-[15px] text-[#4b5275] leading-relaxed">Free to use — no credit card required.</p>
        </div>

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

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput label="First name" value={firstName} onChange={setFirstName} placeholder="Maria" required={true} />
            <FieldInput label="Middle name (optional)" value={middleName} onChange={setMiddleName} placeholder="Clara" required={false} />
          </div>
          <FieldInput label="Last name" value={lastName} onChange={setLastName} placeholder="Santos" required={true} />
          <FieldInput label="Email address" type="email" value={email} onChange={setEmail} placeholder="maria.santos@dlsu.edu.ph" />

          {/* password */}
          <div className="space-y-2">
            <label htmlFor="signup-password-input" className="auth-label">Password</label>
            <div className="auth-field">
              <input id="signup-password-input" type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" required
                aria-describedby="signup-password-requirements" autoComplete="new-password"
                className="auth-input auth-input--toggle" />
              <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(!showPw)} className="auth-eye auth-focus">
                <Eye open={showPw} />
              </button>
            </div>
            <PasswordRequirements id="signup-password-requirements" password={pw} />
          </div>

          {/* terms */}
          <div className="flex items-start gap-3 w-full text-left select-none pt-1">
            <button
              type="button"
              role="checkbox"
              aria-checked={agreed}
              onClick={() => setAgreed(!agreed)}
              className="auth-focus mt-0.5 w-[20px] h-[20px] min-w-[20px] rounded-md border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer"
              style={{ background: agreed ? B : "white", borderColor: agreed ? B : "#c4c8e6" }}
              aria-label="Agree to terms of service and privacy policy"
            >
              {agreed && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" className="w-2.5 h-2.5" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>}
            </button>
            <span className="text-sm text-[#4b5275] leading-relaxed">
              I agree to the{" "}
              <button
                type="button"
                onClick={() => setLegalModal("terms")}
                className="auth-link auth-focus px-0.5 cursor-pointer"
              >
                Terms of Service
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={() => setLegalModal("privacy")}
                className="auth-link auth-focus px-0.5 cursor-pointer"
              >
                Privacy Policy
              </button>
            </span>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={!canSubmit} className="auth-primary auth-focus">
              {loading ? <><Spinner />Creating account…</> : "Create account"}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-[#4b5275] mt-6">
          Already have an account?{" "}
          <button onClick={() => onNavigate("login")} className="auth-link auth-focus px-1">Log in</button>
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
                      Resync provides consecutive-section coherence checks, citation accessibility scanning, and an AI-text indicator. Analysis results and recommendations are advisory tools intended to assist scholarly writing and revision, and should be evaluated in accordance with your institution's academic guidelines.
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
