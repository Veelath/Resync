import { useState } from "react";
import type React from 'react';
import { ArrowRight } from 'lucide-react';
import { Spinner, Eye, GIcon } from '../components/AppPrimitives';
import { AuthShell } from '../components/AuthShell';
import type { Screen } from '../lib/appTypes';
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
    <AuthShell onNavigate={onNavigate} onBack={onBack}>
      <div>
        {/* Header */}
        <div className="auth-rise mb-7" style={{ ['--rise-delay' as string]: '0.05s' }}>
          <p className="auth-eyebrow mb-3">Academic portal</p>
          <h1 className="text-[40px] lg:text-[48px] font-extrabold text-[#0b0f3d] tracking-[-0.035em] leading-[1.05] mb-3">Welcome back</h1>
          <p className="text-[16px] text-[#4b5275] leading-relaxed">Sign in to review your research manuscript and coherence reports.</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100" role="alert">{error}</div>}

        <form onSubmit={submit} className="space-y-5 auth-rise" style={{ ['--rise-delay' as string]: '0.15s' }}>
          <div className="space-y-2">
            <label htmlFor="email-input" className="auth-label">Email address</label>
            <div className="auth-field">
              <span className="auth-field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7l8.5 6 8.5-6" /></svg>
              </span>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="maria.santos@dlsu.edu.ph"
                required
                autoComplete="email"
                className="auth-input auth-input--icon"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password-input" className="auth-label">Password</label>
            <div className="auth-field">
              <span className="auth-field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
              </span>
              <input
                id="password-input"
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="auth-input auth-input--icon auth-input--toggle"
              />
              <button
                type="button"
                aria-label={showPw ? "Hide password" : "Show password"}
                onClick={() => setShowPw(!showPw)}
                className="auth-eye auth-focus"
              >
                <Eye open={showPw} />
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotSuccess(false);
                  setForgotError("");
                  setForgotModal(true);
                }}
                className="auth-link auth-focus text-sm px-1"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <div className="auth-actions">
            <button type="submit" disabled={!canSubmit} className="auth-primary auth-primary--auto auth-primary--cta auth-focus">
              {loading ? <><Spinner /> Signing in…</> : <>Sign in to ReSync<ArrowRight /></>}
            </button>
            <button type="button" onClick={() => onNavigate("signup")} className="auth-link auth-link--cta auth-focus">Sign up free</button>
          </div>
        </form>

        <div className="auth-or my-6 auth-rise" style={{ ['--rise-delay' as string]: '0.25s' }}>
          <span>or</span>
        </div>

        {/* Google SSO */}
        <button
          type="button"
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
          className="auth-google auth-focus auth-rise"
          style={{ ['--rise-delay' as string]: '0.35s' }}
        >
          <GIcon /> Continue with Google
        </button>

        <div className="mt-7 pt-5 border-t border-[#e6e8f7] flex items-center justify-center gap-2 text-xs text-[#7d81a3] lg:hidden">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
          <span>256-bit encryption · Academic manuscript privacy guaranteed</span>
        </div>

        {forgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="forgot-title" className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#f6f7ff]">
                <h3 id="forgot-title" className="text-base font-bold text-[#0b0f3d]">Reset Password</h3>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setForgotModal(false)}
                  className="auth-focus w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4" aria-hidden="true">
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
                      className="auth-primary auth-focus"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <p className="text-sm text-[#4b5275] leading-relaxed">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                    {forgotError && (
                      <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                        {forgotError}
                      </div>
                    )}
                    <div className="space-y-2">
                      <label htmlFor="forgot-email-input" className="auth-label">Email address</label>
                      <input
                        id="forgot-email-input"
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="maria.santos@dlsu.edu.ph"
                        required
                        autoComplete="email"
                        className="auth-input"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!forgotEmail || forgotLoading}
                      className="auth-primary auth-focus"
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
    </AuthShell>
  );
}
