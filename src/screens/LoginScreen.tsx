import { useState } from "react";
import type React from 'react';
import { Spinner, Eye, GIcon } from '../components/AppPrimitives';
import { AuthLayout } from '../components/AuthLayout';
import type { Screen } from '../lib/appTypes';
import { B, BH, BL } from '../lib/brand';
import { supabase } from '../lib/supabase';

export function LoginScreen({ onNavigate, onBack, onLoginSuccess }: { onNavigate: (s: Screen) => void; onBack: () => void; onLoginSuccess?: () => void }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canSubmit = !!email && !!pw && !loading;

  // Forgot password modal state
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail || forgotLoading) return;
    setForgotLoading(true);
    setForgotError("");
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setForgotLoading(false);
    if (error) {
      setForgotError("Unable to process request. Please try again later.");
    } else {
      setForgotSuccess(true);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      onLoginSuccess?.();
    }
  }

  return (
    <AuthLayout onNavigate={onNavigate} onBack={onBack}>
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase mb-3" style={{ background: BL, color: B }}>
            Academic Portal
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Welcome back</h1>
          <p className="text-xs text-gray-500 leading-relaxed">Sign in to review your research manuscript and coherence reports.</p>
        </div>

        {/* Google SSO */}
        <button
          type="button"
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })}
          className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors duration-150 mb-5 shadow-sm active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          <GIcon /> Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[10px] text-gray-400 font-bold tracking-wider">OR SIGN IN WITH EMAIL</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email-input" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email address</label>
            <div className="relative">
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="maria.santos@dlsu.edu.ph"
                required
                className="w-full h-11 pl-10 pr-4 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all"
                style={{ borderColor: "#e5e7eb" }}
                onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
              />
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password-input" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotSuccess(false);
                  setForgotError("");
                  setForgotModal(true);
                }}
                className="text-xs font-semibold hover:underline rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                style={{ color: B }}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="password-input"
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full h-11 pl-10 pr-11 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all"
                style={{ borderColor: "#e5e7eb" }}
                onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
              />
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              </div>
              <button
                type="button"
                aria-label={showPw ? "Hide password" : "Show password"}
                onClick={() => setShowPw(!showPw)}
                className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                <Eye open={showPw} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 mt-2"
            style={{
              background: canSubmit ? `linear-gradient(135deg, ${B}, ${BH})` : "#f3f4f6",
              color: canSubmit ? "white" : "#9ca3af",
              cursor: canSubmit ? "pointer" : "not-allowed",
              boxShadow: canSubmit ? `0 6px 20px ${B}30` : "none"
            }}
          >
            {loading ? <><Spinner /> Signing in…</> : "Sign in to ReSync →"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          Don't have an account?{" "}
          <button onClick={() => onNavigate("signup")} className="font-bold hover:underline rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" style={{ color: B }}>Sign up free</button>
        </p>

        <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-[11px] text-gray-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-400" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
          <span>256-bit encryption · Academic manuscript privacy guaranteed</span>
        </div>

        {forgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-base font-bold text-gray-900">Reset Password</h3>
                <button
                  type="button"
                  onClick={() => setForgotModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                {forgotSuccess ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-100">
                      If an account exists for that email, a reset link has been sent.
                    </div>
                    <button
                      type="button"
                      onClick={() => setForgotModal(false)}
                      className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all cursor-pointer"
                      style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                    {forgotError && (
                      <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                        {forgotError}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email address</label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="maria.santos@dlsu.edu.ph"
                        required
                        className="w-full h-11 px-4 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all"
                        style={{ borderColor: "#e5e7eb" }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!forgotEmail || forgotLoading}
                      className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all mt-2"
                      style={{
                        background: (forgotEmail && !forgotLoading) ? `linear-gradient(135deg, ${B}, ${BH})` : "#f3f4f6",
                        color: (forgotEmail && !forgotLoading) ? "white" : "#9ca3af",
                        cursor: (forgotEmail && !forgotLoading) ? "pointer" : "not-allowed",
                      }}
                    >
                      {forgotLoading ? <><Spinner /> Sending reset link…</> : "Send reset link"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
