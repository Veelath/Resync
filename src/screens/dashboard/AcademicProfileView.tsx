import { B, BH } from '../../lib/brand';
import type { Dispatch, SetStateAction } from 'react';

type ProfileFields = { firstName: string; middleName: string; lastName: string; fullName: string; email: string; contactNumber: string };

export function AcademicProfileView({ setActiveNav, editMode, setEditMode, profile, draft, setDraft, saveProfile, cancelEdit, avatarUrl, avatarError, handleAvatarFile, removeAvatar }: { setActiveNav: Dispatch<SetStateAction<"Dashboard" | "Academic Profile" | "Settings" | "Usage / Credits">>; editMode: boolean; setEditMode: Dispatch<SetStateAction<boolean>>; profile: ProfileFields; draft: ProfileFields; setDraft: Dispatch<SetStateAction<ProfileFields>>; saveProfile: () => void; cancelEdit: () => void; avatarUrl: string | null; avatarError: string; handleAvatarFile: (file: File) => Promise<void>; removeAvatar: () => void }) {
  return (
        <main className="phase2-profile w-full max-w-[1240px] mx-auto px-6 md:px-8 py-10 space-y-7">

          {/* Page header */}
          <div className="phase2-profile-heading flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: B }}>Account</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Academic Profile</h2>
              <p className="text-sm text-gray-500 mt-1.5">Manage your personal profile and contact information.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {editMode ? (
                <>
                  <button onClick={cancelEdit}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                  <button onClick={saveProfile}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}>
                    Save Changes
                  </button>
                </>
              ) : (
                <button onClick={() => { setDraft(profile); setEditMode(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:bg-gray-50"
                  style={{ borderColor: `${B}25`, color: B }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Identity & Profile Picture Card */}
          <div className="phase2-profile-card bg-white rounded-3xl overflow-hidden">
            <div className="phase2-profile-band px-8 sm:px-10 py-9 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
              {/* Avatar with Photo change trigger */}
              <div className="relative group shrink-0">
                <div className="w-28 h-28 rounded-3xl overflow-hidden flex items-center justify-center text-white text-4xl font-bold shadow-md"
                  style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt={`${profile.fullName} profile picture`} className="w-full h-full object-cover" />
                    : profile.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <label className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-400 cursor-pointer transition-all" title="Change profile picture">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  <input type="file" aria-label="Change profile picture" accept="image/jpeg,image/png" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) void handleAvatarFile(f); e.target.value = ""; }} />
                </label>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {editMode ? (
                    <input
                      aria-label="Full name"
                      value={draft.fullName}
                      onChange={e => setDraft({ ...draft, fullName: e.target.value })}
                      placeholder="Full Name"
                      className="text-xl font-bold text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-1 focus:border-blue-500 outline-none w-full max-w-sm"
                    />
                  ) : (
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{profile.fullName}</h3>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-400"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  {profile.email}
                </p>
              </div>
              <div className="sm:ml-auto sm:max-w-[14rem] text-left">
                <p className="text-xs font-bold text-gray-800">Profile picture</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">JPEG or PNG, max 5MB. Click the camera badge on your avatar to upload.</p>
                {avatarError && <p role="alert" className="text-xs font-semibold text-red-600 mt-1.5">{avatarError}</p>}
                {avatarUrl && <button type="button" onClick={removeAvatar} className="text-xs font-semibold text-gray-500 hover:text-red-600 hover:underline mt-1.5">Remove photo</button>}
              </div>
            </div>

            {/* Contact Details List */}
            <div className="phase2-profile-details px-8 sm:px-10 py-8">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-5">Personal Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Full Name */}
                <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white border border-gray-200 text-gray-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400">Full Name</p>
                    {editMode ? (
                      <input
                        aria-label="Full name"
                        value={draft.fullName}
                        onChange={e => setDraft({ ...draft, fullName: e.target.value })}
                        className="text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-2.5 py-1 w-full mt-1 focus:outline-none focus:border-blue-400"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{profile.fullName}</p>
                    )}
                  </div>
                </div>

                {/* Email Address */}
                <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white border border-gray-200 text-gray-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400">Email Address</p>
                    {editMode ? (
                      <input
                        type="email"
                        aria-label="Email address"
                        value={draft.email}
                        onChange={e => setDraft({ ...draft, email: e.target.value })}
                        className="text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-2.5 py-1 w-full mt-1 focus:outline-none focus:border-blue-400"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{profile.email}</p>
                    )}
                  </div>
                </div>

                {/* Contact Number */}
                <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white border border-gray-200 text-gray-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400">Contact Number</p>
                    {editMode ? (
                      <input
                        type="tel"
                        aria-label="Contact number"
                        value={draft.contactNumber}
                        onChange={e => setDraft({ ...draft, contactNumber: e.target.value })}
                        className="text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-2.5 py-1 w-full mt-1 focus:outline-none focus:border-blue-400"
                      />
                    ) : (
                      profile.contactNumber ? (
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{profile.contactNumber}</p>
                    ) : (
                      <p className="text-sm text-gray-500 mt-0.5">
                        Not added yet{" "}
                        <button type="button" onClick={() => { setDraft(profile); setEditMode(true); }} className="font-semibold hover:underline" style={{ color: B }}>Add number</button>
                      </p>
                    )
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="phase2-password-link">
            <div className="phase2-lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/></svg></div>
            <div><strong>Need to change your password?</strong><p>Password and security options are managed under Settings.</p></div>
            <button type="button" onClick={() => setActiveNav('Settings')}>Go to Settings <span aria-hidden="true">→</span></button>
          </div>
        </main>
  );
}
