import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import '../upload-flow.css';

type ProfileFields = { firstName: string; middleName: string; lastName: string; fullName: string; email: string; contactNumber: string };
type Academic = { university: string; program: string; yearLevel: string; researchTitle: string };

const EMPTY_ACADEMIC: Academic = { university: '', program: '', yearLevel: '', researchTitle: '' };
const academicKey = (userId?: string) => `resync_academic_${userId ?? 'guest'}`;

function loadAcademic(userId?: string): Academic {
  try {
    const saved = JSON.parse(localStorage.getItem(academicKey(userId)) || '{}');
    return { ...EMPTY_ACADEMIC, ...Object.fromEntries(Object.entries(saved).filter(([key, value]) => key in EMPTY_ACADEMIC && typeof value === 'string')) };
  } catch {
    return EMPTY_ACADEMIC;
  }
}

function Field({ icon, label, value, editing, input, onAdd }: { icon: ReactNode; label: string; value: string; editing: boolean; input: ReactNode; onAdd: () => void }) {
  const empty = !value.trim();
  return (
    <div className="uf-field" data-empty={empty && !editing}>
      <span className="uf-ic" style={{ width: 40, height: 40 }}>{icon}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="uf-field-label">{label}</div>
        {editing ? input : empty
          ? <div className="uf-field-value"><span style={{ color: '#9a98b8', fontWeight: 600 }}>Not added</span> · <button type="button" onClick={onAdd} className="uf-link">Add</button></div>
          : <div className="uf-field-value">{value}</div>}
      </div>
    </div>
  );
}

const svg = (d: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]" aria-hidden="true"><path d={d} /></svg>;
const ICONS = {
  person: svg('M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z'),
  mail: svg('M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6'),
  phone: svg('M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z'),
  school: svg('M2 9l10-5 10 5-10 5zM6 11v5c0 1 2.7 3 6 3s6-2 6-3v-5'),
  book: svg('M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z'),
  year: svg('M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z'),
  paper: svg('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h4'),
};

export function AcademicProfileView({ setActiveNav, editMode, setEditMode, profile, draft, setDraft, saveProfile, cancelEdit, avatarUrl, avatarError, handleAvatarFile, removeAvatar, userId, credits = null, scansRun = null, memberSince }: { setActiveNav: Dispatch<SetStateAction<"Dashboard" | "Academic Profile" | "Settings" | "Usage / Credits">>; editMode: boolean; setEditMode: Dispatch<SetStateAction<boolean>>; profile: ProfileFields; draft: ProfileFields; setDraft: Dispatch<SetStateAction<ProfileFields>>; saveProfile: () => void; cancelEdit: () => void; avatarUrl: string | null; avatarError: string; handleAvatarFile: (file: File) => Promise<void>; removeAvatar: () => void; userId?: string; credits?: number | null; scansRun?: number | null; memberSince?: string }) {
  const [academic, setAcademic] = useState<Academic>(() => loadAcademic(userId));
  const [academicDraft, setAcademicDraft] = useState<Academic>(academic);
  useEffect(() => { const loaded = loadAcademic(userId); setAcademic(loaded); setAcademicDraft(loaded); }, [userId]);

  const startEdit = () => { setDraft(profile); setAcademicDraft(academic); setEditMode(true); };
  const cancel = () => { setAcademicDraft(academic); cancelEdit(); };
  const save = () => {
    setAcademic(academicDraft);
    try { localStorage.setItem(academicKey(userId), JSON.stringify(academicDraft)); } catch { /* storage unavailable: the details last until the page is closed */ }
    saveProfile();
  };

  const initials = profile.fullName.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const filled = [profile.fullName, profile.email, profile.contactNumber, academic.university, academic.program, academic.yearLevel, academic.researchTitle].filter(value => value.trim()).length;
  const completeness = Math.round((filled / 7) * 100);
  const missing = !profile.contactNumber.trim() && !academic.university.trim() ? 'Add your university and contact number to finish setting up.'
    : !academic.university.trim() ? 'Add your university to finish setting up.'
    : !profile.contactNumber.trim() ? 'Add your contact number to finish setting up.'
    : completeness < 100 ? 'Add your remaining academic details to finish setting up.' : 'Your profile is complete.';
  const since = memberSince ? new Date(memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';

  const inputClass = 'uf-field-input';
  const text = (value: string, set: (next: string) => void, label: string, type = 'text') =>
    <input aria-label={label} type={type} value={value} onChange={event => set(event.target.value)} className={inputClass} />;

  return (
    <main className="uf" style={{ minHeight: 'auto', background: 'transparent' }}>
      <div className="uf-wrap" style={{ paddingTop: 28 }}>
        <div className="uf-head">
          <div>
            <div className="uf-eb">Account</div>
            <h1 className="uf-h1">Academic profile</h1>
            <p className="uf-sub">Manage your personal profile, contact and research information.</p>
          </div>
          {editMode && (
            <div className="uf-actions">
              <button type="button" onClick={cancel} className="uf-btn is-ghost is-sm">Cancel</button>
              <button type="button" onClick={save} className="uf-btn is-sm">Save changes</button>
            </div>
          )}
        </div>

        <div className="uf-profile">
          <div className="uf-card" style={{ overflow: 'hidden' }}>
            <div style={{ height: 120, position: 'relative', background: 'linear-gradient(120deg,#17136F,#3A33E6)', overflow: 'hidden' }}>
              <i style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.09)', right: -40, top: -70 }} />
              <i style={{ position: 'absolute', width: 170, height: 170, borderRadius: '50%', background: 'rgba(255,255,255,.06)', left: -50, bottom: -90 }} />
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: -62 }}>
              <span style={{ position: 'relative', display: 'block', width: 124, height: 124 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 124, height: 124, borderRadius: '50%', overflow: 'hidden', border: '5px solid #fff', boxShadow: '0 18px 32px -14px rgba(23,19,111,.6)', background: 'linear-gradient(135deg,#2b25c8,#5a54ee)', color: '#fff', fontSize: 38, fontWeight: 800 }}>
                  {avatarUrl ? <img src={avatarUrl} alt={`${profile.fullName} profile picture`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                </span>
                <label title="Change profile picture" style={{ position: 'absolute', right: 0, bottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 31, height: 31, borderRadius: '50%', background: '#2b25c8', border: '3px solid #fff', color: '#fff', cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  <input type="file" aria-label="Change profile picture" accept="image/jpeg,image/png" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void handleAvatarFile(file); event.target.value = ''; }} />
                </label>
              </span>
              {avatarUrl && <button type="button" onClick={removeAvatar} className="uf-link" style={{ fontSize: 12 }}>Remove photo</button>}
              {avatarError && <p role="alert" style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#d6264a', textAlign: 'center' }}>{avatarError}</p>}
              <b style={{ fontSize: 23, letterSpacing: '-.01em', textAlign: 'center' }}>{profile.fullName}</b>
              <span style={{ fontSize: 13.5, color: '#6b6890', wordBreak: 'break-all', textAlign: 'center' }}>{profile.email}</span>
              <span className="uf-ok">● Active</span>

              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', border: '1px solid #eeedfb', borderRadius: 16, background: '#f7f7fd', textAlign: 'center', marginTop: 8 }}>
                {[[credits === null ? '—' : String(credits), 'Credits'], [scansRun === null ? '—' : String(scansRun), 'Scans run'], [since, 'Member since']].map(([value, label]) => (
                  <div key={label} style={{ padding: '14px 8px' }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: '#2b25c8' }}>{value}</div>
                    <div style={{ fontSize: 11.5, color: '#7d7b9e' }}>{label}</div>
                  </div>
                ))}
              </div>

              <div style={{ width: '100%', marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                  <span>Profile completeness</span><span style={{ color: '#2b25c8' }}>{completeness}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 8, background: '#eeedfb', margin: '9px 0 10px', overflow: 'hidden' }}>
                  <i style={{ display: 'block', width: `${completeness}%`, height: '100%', borderRadius: 8, background: 'linear-gradient(90deg,#2b25c8,#6c66f5)' }} />
                </div>
                <div style={{ fontSize: 12.5, color: '#6b6890' }}>{missing}</div>
              </div>

              {!editMode && (
                <button type="button" onClick={startEdit} className="uf-btn" style={{ width: '100%', height: 48, marginTop: 8 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  Edit profile
                </button>
              )}
            </div>
          </div>

          <div className="uf-col" style={{ gap: 18 }}>
            <div className="uf-card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div><b style={{ fontSize: 16.5 }}>Personal details</b><div style={{ fontSize: 12.5, color: '#7d7b9e' }}>How you appear in your reports</div></div>
                {!editMode && <button type="button" onClick={startEdit} className="uf-btn is-ghost is-sm">Edit</button>}
              </div>
              <div className="uf-fields three">
                <Field icon={ICONS.person} label="Full name" value={profile.fullName} editing={editMode} onAdd={startEdit}
                  input={text(draft.fullName, value => setDraft({ ...draft, fullName: value }), 'Full name')} />
                <Field icon={ICONS.mail} label="Email address" value={profile.email} editing={editMode} onAdd={startEdit}
                  input={text(draft.email, value => setDraft({ ...draft, email: value }), 'Email address', 'email')} />
                <Field icon={ICONS.phone} label="Contact number" value={profile.contactNumber} editing={editMode} onAdd={startEdit}
                  input={text(draft.contactNumber, value => setDraft({ ...draft, contactNumber: value }), 'Contact number', 'tel')} />
              </div>
            </div>

            <div className="uf-card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div><b style={{ fontSize: 16.5 }}>Academic information</b><div style={{ fontSize: 12.5, color: '#7d7b9e' }}>Used on your manuscript reports · saved on this device</div></div>
                {!editMode && <button type="button" onClick={startEdit} className="uf-btn is-ghost is-sm">Edit</button>}
              </div>
              <div className="uf-fields two">
                <Field icon={ICONS.school} label="University" value={academic.university} editing={editMode} onAdd={startEdit}
                  input={text(academicDraft.university, value => setAcademicDraft({ ...academicDraft, university: value }), 'University')} />
                <Field icon={ICONS.book} label="Program" value={academic.program} editing={editMode} onAdd={startEdit}
                  input={text(academicDraft.program, value => setAcademicDraft({ ...academicDraft, program: value }), 'Program')} />
                <Field icon={ICONS.year} label="Year level" value={academic.yearLevel} editing={editMode} onAdd={startEdit}
                  input={text(academicDraft.yearLevel, value => setAcademicDraft({ ...academicDraft, yearLevel: value }), 'Year level')} />
                <Field icon={ICONS.paper} label="Research title" value={academic.researchTitle} editing={editMode} onAdd={startEdit}
                  input={text(academicDraft.researchTitle, value => setAcademicDraft({ ...academicDraft, researchTitle: value }), 'Research title')} />
              </div>
            </div>

            <div className="uf-card" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span className="uf-ic" style={{ background: '#fff3db', color: '#c77a0b' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true"><path d="M5 11h14v10H5zM8 11V7a4 4 0 018 0v4" /></svg>
                </span>
                <div><b style={{ fontSize: 15 }}>Need to change your password?</b><div style={{ fontSize: 12.5, color: '#6b6890' }}>Password and security options are under Settings.</div></div>
              </div>
              <button type="button" onClick={() => setActiveNav('Settings')} className="uf-btn is-ghost is-sm">Go to settings →</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
