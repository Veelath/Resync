import { useState, useId } from "react";
import type React from 'react';
import { Spinner, Eye, GIcon } from '../components/AppPrimitives';
import { AuthLayout } from '../components/AuthLayout';
import type { Screen } from '../lib/appTypes';
import { B, BH, BL } from '../lib/brand';
import { supabase } from '../lib/supabase';

function FieldInput({ label, type = "text", value, onChange, placeholder, right, required = true }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder: string; right?: React.ReactNode; required?: boolean;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
        {right}
      </div>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        className="w-full h-11 px-4 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all"
        style={{ borderColor: focused ? B : "#e5e7eb", boxShadow: focused ? `0 0 0 3px ${B}12` : "none" }} />
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

  const str = pw.length === 0 ? 0 : pw.length < 8 ? 1 : pw.length < 12 ? 2 : 3;
  const strMeta = [
    { label: "", color: "", bar: "" },
    { label: "Weak", color: "#ef4444", bar: "#f87171" },
    { label: "Good", color: "#d97706", bar: "#fbbf24" },
    { label: "Strong", color: "#16a34a", bar: "#4ade80" },
  ][str];
  const canSubmit = !!firstName.trim() && !!lastName.trim() && !!email && pw.length >= 8 && agreed && !loading;

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
    <AuthLayout onNavigate={onNavigate} onBack={onBack}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldInput label="First name" value={firstName} onChange={setFirstName} placeholder="Maria" required={true} />
            <FieldInput label="Middle name (optional)" value={middleName} onChange={setMiddleName} placeholder="Clara" required={false} />
          </div>
          <FieldInput label="Last name" value={lastName} onChange={setLastName} placeholder="Santos" required={true} />
          <FieldInput label="Email address" type="email" value={email} onChange={setEmail} placeholder="maria.santos@dlsu.edu.ph" />

          {/* password */}
          <div className="space-y-1.5">
            <label htmlFor="signup-password-input" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input id="signup-password-input" type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 8 characters" required
                className="w-full h-11 px-4 pr-11 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all"
                style={{ borderColor: "#e5e7eb" }}
                onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }} />
              <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(!showPw)} className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
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
              role="checkbox"
              aria-checked={agreed}
              onClick={() => setAgreed(!agreed)}
              className="mt-0.5 w-[18px] h-[18px] min-w-[18px] rounded-md border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
              style={{ background: agreed ? B : "white", borderColor: agreed ? B : "#d1d5db" }}
              aria-label="Agree to terms of service and privacy policy"
            >
              {agreed && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" className="w-2.5 h-2.5" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>}
            </button>
            <span className="text-xs text-gray-500 leading-relaxed">
              I agree to the{" "}
              <button
                type="button"
                onClick={() => setLegalModal("terms")}
                className="font-bold hover:underline cursor-pointer rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                style={{ color: B }}
              >
                Terms of Service
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={() => setLegalModal("privacy")}
                className="font-bold hover:underline cursor-pointer rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                style={{ color: B }}
              >
                Privacy Policy
              </button>
            </span>
          </div>

          <button type="submit" disabled={!canSubmit}
            className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 mt-1"
            style={{ background: canSubmit ? `linear-gradient(135deg, ${B}, ${BH})` : "#f3f4f6", color: canSubmit ? "white" : "#9ca3af", cursor: canSubmit ? "pointer" : "not-allowed", boxShadow: canSubmit ? `0 6px 20px ${B}30` : "none" }}>
            {loading ? <><Spinner />Creating account…</> : "Create account →"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          Already have an account?{" "}
          <button onClick={() => onNavigate("login")} className="font-bold hover:underline rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" style={{ color: B }}>Log in</button>
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
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
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
