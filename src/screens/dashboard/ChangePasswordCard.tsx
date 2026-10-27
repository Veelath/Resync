import { Eye, Spinner } from '../../components/AppPrimitives';
import { B, BH } from '../../lib/brand';
import type { Dispatch, FormEvent, SetStateAction } from 'react';

export function ChangePasswordCard({ pwSuccessMsg, pwErrorMsg, currentPw, setCurrentPw, newPw, setNewPw, confirmPw, setConfirmPw, showCurrentPw, setShowCurrentPw, showNewPw, setShowNewPw, showConfirmPw, setShowConfirmPw, pwLoading, handleUpdatePassword }: {
  pwSuccessMsg: string;
  pwErrorMsg: string;
  currentPw: string;
  setCurrentPw: Dispatch<SetStateAction<string>>;
  newPw: string;
  setNewPw: Dispatch<SetStateAction<string>>;
  confirmPw: string;
  setConfirmPw: Dispatch<SetStateAction<string>>;
  showCurrentPw: boolean;
  setShowCurrentPw: Dispatch<SetStateAction<boolean>>;
  showNewPw: boolean;
  setShowNewPw: Dispatch<SetStateAction<boolean>>;
  showConfirmPw: boolean;
  setShowConfirmPw: Dispatch<SetStateAction<boolean>>;
  pwLoading: boolean;
  handleUpdatePassword: (event: FormEvent) => void;
}) {
  return (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fef3c7", color: "#d97706" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Change Password</h3>
                <p className="text-xs text-gray-400">Update your account password to maintain academic workspace security.</p>
              </div>
            </div>

            {pwSuccessMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4 text-green-600 shrink-0"><path d="M5 12l5 5L20 7" /></svg>
                <span className="font-semibold">{pwSuccessMsg}</span>
              </div>
            )}

            {pwErrorMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-600 shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span>{pwErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-xl">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full h-11 px-4 pr-11 rounded-xl border text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                    style={{ borderColor: "#e5e7eb" }}
                    onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                    onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Eye open={showCurrentPw} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full h-11 px-4 pr-11 rounded-xl border text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                    style={{ borderColor: "#e5e7eb" }}
                    onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                    onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Eye open={showNewPw} />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">Must be at least 8 characters long.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full h-11 px-4 pr-11 rounded-xl border text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                    style={{ borderColor: "#e5e7eb" }}
                    onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                    onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Eye open={showConfirmPw} />
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all flex items-center gap-2 shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${B}, ${BH})`, opacity: pwLoading ? 0.7 : 1 }}
                >
                  {pwLoading ? <><Spinner /> Updating…</> : "Update Password"}
                </button>
              </div>
            </form>
          </div>
  );
}
