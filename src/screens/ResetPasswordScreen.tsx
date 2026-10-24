import { useState } from "react";
import type React from 'react';
import { Spinner, Eye } from '../components/AppPrimitives';
import { AuthLayout } from '../components/AuthLayout';
import type { Screen } from '../lib/appTypes';
import { B, BH, BL } from '../lib/brand';
import { supabase } from '../lib/supabase';

export function ResetPasswordScreen({ onNavigate, onBack }: { onNavigate: (s: Screen) => void; onBack: () => void }) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const canSubmit = password.length >= 8 && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onNavigate("login");
      }, 2500);
    }
  }

  return (
    <AuthLayout onNavigate={onNavigate} onBack={onBack}>
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase mb-3" style={{ background: BL, color: B }}>
            Security
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Set new password</h1>
          <p className="text-xs text-gray-500 leading-relaxed">Enter your new account password below.</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-100">
            Password updated successfully! Redirecting to login…
          </div>
        )}

        {!success ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="w-full h-11 pl-10 pr-11 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all"
                  style={{ borderColor: "#e5e7eb" }}
                  onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                  onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                />
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <Eye open={showPw} />
                </button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <p className="text-[11px] text-amber-600 mt-1">Must be at least 8 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all mt-2"
              style={{
                background: canSubmit ? `linear-gradient(135deg, ${B}, ${BH})` : "#f3f4f6",
                color: canSubmit ? "white" : "#9ca3af",
                cursor: canSubmit ? "pointer" : "not-allowed",
                boxShadow: canSubmit ? `0 6px 20px ${B}30` : "none"
              }}
            >
              {loading ? <><Spinner /> Updating password…</> : "Update Password →"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white transition-all mt-2 cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}
          >
            Go to login →
          </button>
        )}

        <p className="text-center text-xs text-gray-500 mt-6">
          Remembered your credentials?{" "}
          <button onClick={() => onNavigate("login")} className="font-bold hover:underline" style={{ color: B }}>Back to login</button>
        </p>
      </div>
    </AuthLayout>
  );
}
