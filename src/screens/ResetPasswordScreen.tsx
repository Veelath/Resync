import { useState } from "react";
import type React from 'react';
import { Spinner, Eye } from '../components/AppPrimitives';
import { AuthShell } from '../components/AuthShell';
import { PasswordRequirements, isPasswordValid, passwordPolicyMessage } from '../components/PasswordRequirements';
import type { Screen } from '../lib/appTypes';
import { supabase } from '../lib/supabase';

export function ResetPasswordScreen({ onNavigate, onBack }: { onNavigate: (s: Screen) => void; onBack: () => void }) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const canSubmit = isPasswordValid(password) && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isPasswordValid(password)) {
      setError("Password does not meet all the requirements yet.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(passwordPolicyMessage(error));
    } else {
      setSuccess(true);
      setTimeout(() => {
        onNavigate("login");
      }, 2500);
    }
  }

  return (
    <AuthShell onNavigate={onNavigate} onBack={onBack}>
      <div>
        {/* Header */}
        <div className="auth-rise mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase mb-3" style={{ background: "#eef0ff", color: "#1a1fcc" }}>
            Security
          </span>
          <h1 className="text-3xl lg:text-[42px] font-extrabold text-[#0b0f3d] tracking-[-0.035em] leading-[1.05] mb-2">Set new password</h1>
          <p className="text-[15px] text-[#4b5275] leading-relaxed">Enter your new account password below.</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100" role="alert">{error}</div>}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-100" role="status">
            Password updated successfully! Redirecting to login…
          </div>
        )}

        {!success ? (
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="reset-password-input" className="auth-label">New password</label>
              <div className="auth-field">
                <input
                  id="reset-password-input"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="New password"
                  required
                  aria-describedby="reset-password-requirements"
                  autoComplete="new-password"
                  className="auth-input auth-input--toggle"
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
              <PasswordRequirements id="reset-password-requirements" password={password} />
            </div>

            <div className="pt-2">
              <button type="submit" disabled={!canSubmit} className="auth-primary auth-focus">
                {loading ? <><Spinner /> Updating password…</> : "Update password"}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="auth-primary auth-focus"
          >
            Go to login
          </button>
        )}

        <p className="text-center text-sm text-[#4b5275] mt-6">
          Remembered your credentials?{" "}
          <button onClick={() => onNavigate("login")} className="auth-link auth-focus px-1">Back to login</button>
        </p>
      </div>
    </AuthShell>
  );
}
