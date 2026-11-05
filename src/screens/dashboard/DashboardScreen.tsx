import '../upload-flow.css';
import { CreditsPanel, type CreditActivity } from './CreditsPanel';
import { ChangePasswordCard } from './ChangePasswordCard';
import { DashboardHeader } from './DashboardHeader';
import type { AppNotification, NotificationPrefs } from '../../components/ScanNotifications';
import { PaymentModal } from './PaymentModal';
import { DashboardHome } from './DashboardHome';
import { AcademicProfileView } from './AcademicProfileView';
import { parseUserProfileMetadata, CREDIT_PACKAGES, AVATAR_MAX_BYTES, avatarKey, resizeAvatar } from './helpers';
import { useState, useEffect, useRef } from "react";
import { BackToTop } from '../../components/AppPrimitives';
import type { Screen } from '../../lib/appTypes';
import { B, BH, BL } from '../../lib/brand';
import guidanceArtwork from "@/assets/guidance-reference.webp";
import { Info } from "lucide-react";
import type React from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { emailError } from '../../lib/validation';
import { isPasswordValid, passwordPolicyMessage } from '../../components/PasswordRequirements';
import { announcePayment, payWithProof, PROOF_METHOD_LABEL, type ProofPayment } from '../../lib/paymentProof';
import { getCreditBalance, getCreditHistory, purchaseCredits } from '../../services/api';

type AcademicInfo = { university: string; program: string; yearLevel: string; researchTitle: string };
const readAcademic = (meta?: Record<string, unknown> | null): AcademicInfo => ({
  university: String(meta?.university ?? ""), program: String(meta?.program ?? ""),
  yearLevel: String(meta?.year_level ?? ""), researchTitle: String(meta?.research_title ?? ""),
});
const academicToMetadata = (info: AcademicInfo) => ({ university: info.university.trim(), program: info.program.trim(), year_level: info.yearLevel.trim(), research_title: info.researchTitle.trim() });

export function DashboardScreen({ onNavigate, session, onLogout, notifications = [], onMarkNotificationsRead, onOpenReport, notificationPrefs = { alerts: true, sound: true }, onNotificationPrefsChange }: { notificationPrefs?: NotificationPrefs; onNotificationPrefsChange?: (prefs: NotificationPrefs) => void; onNavigate: (s: Screen, asSample?: boolean) => void; session?: Session | null; onLogout?: () => void; notifications?: AppNotification[]; onMarkNotificationsRead?: () => void; onOpenReport?: (scanId?: string) => void }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const [activeNav, setActiveNav] = useState<"Dashboard" | "Academic Profile" | "Settings" | "Usage / Credits">("Dashboard");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;
  useEffect(() => {
    if (!notifOpen) return;
    const close = (event: MouseEvent) => { if (!notifRef.current?.contains(event.target as Node)) setNotifOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [notifOpen]);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [editMode, setEditMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    try { return localStorage.getItem(avatarKey(session?.user?.id)); } catch { return null; }
  });
  const [avatarError, setAvatarError] = useState("");
  async function handleAvatarFile(file: File) {
    setAvatarError("");
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setAvatarError("Please choose a JPEG or PNG image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError("That image is larger than 5 MB. Please choose a smaller one.");
      return;
    }
    try {
      const dataUrl = await resizeAvatar(file);
      setAvatarUrl(dataUrl);
      try { localStorage.setItem(avatarKey(session?.user?.id), dataUrl); } catch { setAvatarError("Photo updated, but it could not be saved on this device."); }
    } catch {
      setAvatarError("We couldn't read that image. Please try another file.");
    }
  }
  function removeAvatar() {
    setAvatarUrl(null);
    setAvatarError("");
    try { localStorage.removeItem(avatarKey(session?.user?.id)); } catch { /* storage unavailable */ }
  }
  const initialResolved = parseUserProfileMetadata(session?.user?.user_metadata, session?.user?.email);
  const [profile, setProfile] = useState({
    firstName: initialResolved.firstName,
    middleName: initialResolved.middleName,
    lastName: initialResolved.lastName,
    fullName: initialResolved.fullName,
    email: session?.user?.email || '',
    contactNumber: String(session?.user?.user_metadata?.contact_number ?? ""),
  });
  const [draft, setDraft] = useState(profile);
  const [academicInfo, setAcademicInfo] = useState(() => readAcademic(session?.user?.user_metadata));
  const [profileNotice, setProfileNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  useEffect(() => { setAcademicInfo(readAcademic(session?.user?.user_metadata)); }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Saved to the account (not just this page), so the details are still there after a refresh or on another device.
  async function saveProfile(nextAcademic: AcademicInfo) {
    setProfileNotice(null);
    const name = draft.fullName.trim().replace(/\s+/g, " ");
    if (!name || /\d/.test(name)) { setProfileNotice({ kind: "error", text: "Enter your name using letters only." }); return; }
    const contact = draft.contactNumber.trim();
    if (contact && !/^\+?[\d\s()-]{7,20}$/.test(contact)) { setProfileNotice({ kind: "error", text: "Enter a valid contact number, for example 0917 123 4567." }); return; }
    const email = draft.email.trim().toLowerCase();
    const emailChanged = email !== profile.email.trim().toLowerCase();
    const problem = emailChanged ? emailError(email) : null;
    if (problem) { setProfileNotice({ kind: "error", text: problem }); return; }
    const [first, ...rest] = name.split(" ");
    const { error } = await supabase.auth.updateUser({
      ...(emailChanged ? { email } : {}),
      data: { full_name: name, first_name: first, middle_name: "", last_name: rest.join(" "), contact_number: contact, ...academicToMetadata(nextAcademic) },
    });
    if (error) { setProfileNotice({ kind: "error", text: /session/i.test(error.message) ? "Your session has expired. Please sign in again." : error.message || "We could not save your profile. Please try again." }); return; }
    setProfile({ ...draft, fullName: name, firstName: first, middleName: "", lastName: rest.join(" "), contactNumber: contact, email: emailChanged ? profile.email : draft.email });
    setAcademicInfo(nextAcademic);
    setEditMode(false);
    setProfileNotice({ kind: "ok", text: emailChanged ? "Profile saved. Check your new inbox to confirm the email change." : "Profile saved." });
  }
  function cancelEdit() { setDraft(profile); setEditMode(false); setProfileNotice(null); }

  useEffect(() => {
    if (session?.user) {
      const resolved = parseUserProfileMetadata(session.user.user_metadata, session.user.email);
      setProfile(prev => ({
        ...prev,
        firstName: resolved.firstName || prev.firstName || '',
        middleName: resolved.middleName || prev.middleName || '',
        lastName: resolved.lastName || prev.lastName || '',
        fullName: resolved.fullName || prev.fullName || 'User',
        email: session.user.email || prev.email || '',
        contactNumber: String(session.user.user_metadata?.contact_number ?? prev.contactNumber ?? ''),
      }));
    }
  }, [session]);

  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [creditsUsed, setCreditsUsed] = useState<number | null>(null);
  const [settingsSection, setSettingsSection] = useState<string>("settings-profile");
  const [creditHistory, setCreditHistory] = useState<CreditActivity[]>([]);
  const [creditsLoading, setCreditsLoading] = useState(false);

  // Balance, credits used and the purchase/scan history, read from the account.
  async function refreshCredits() {
    if (!session?.user?.id) return;
    try {
      const [bal, hist] = await Promise.all([getCreditBalance(session.user.id), getCreditHistory(session.user.id, 100)]);
      setCreditBalance(bal.balance);
      setCreditsUsed(hist.entries.filter(e => e.kind === 'debit').reduce((a, e) => a + Math.abs(e.delta), 0));
      setCreditHistory(hist.entries);
    } catch (e) {
      console.error('credits fetch failed:', e);
    }
  }

  useEffect(() => {
    if (!session?.user?.id) return;
    setCreditsLoading(true);
    refreshCredits().finally(() => setCreditsLoading(false));
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Credit purchase & mock checkout modal states
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
  const [creditModalStep, setCreditModalStep] = useState<"package" | "payment" | "processing" | "success">("package");
  const [selectedPkgId, setSelectedPkgId] = useState<string>("standard");
  const selectedPkg = CREDIT_PACKAGES.find(p => p.id === selectedPkgId) ?? CREDIT_PACKAGES[2];
  const [receiptRef, setReceiptRef] = useState<string | null>(null);
  const [receiptTime, setReceiptTime] = useState<Date | null>(null);
  const [receiptLast4, setReceiptLast4] = useState<string>("");
  const [receiptAmount, setReceiptAmount] = useState<number>(0);
  const [receiptPkgId, setReceiptPkgId] = useState<string>("");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("123");
  const [cardName, setCardName] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [purchasedCredits, setPurchasedCredits] = useState<number>(0);
  const [receiptMethod, setReceiptMethod] = useState<string | undefined>(undefined);

  function closeBuyCreditsModal() {
    setShowBuyCreditsModal(false);
    setCreditModalStep("package");
    setPaymentError("");
    setReceiptRef(null);
    setReceiptTime(null);
    setReceiptLast4("");
    setReceiptAmount(0);
    setReceiptPkgId("");
  }

  useEffect(() => {
    if (showBuyCreditsModal && !cardName) {
      setCardName(profile.fullName || "Thesis Author");
    }
  }, [showBuyCreditsModal, cardName, profile.fullName]);

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError("");

    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length < 16) {
      setPaymentError("Please enter a valid 16-digit card number.");
      return;
    }

    const expiryMatch = cardExpiry.trim().match(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/);
    if (!expiryMatch) {
      setPaymentError("Please enter a valid expiration date (MM/YY, months 01-12).");
      return;
    }

    const cvcDigits = cardCvc.replace(/\D/g, "");
    if (cvcDigits.length < 3 || cvcDigits.length > 4) {
      setPaymentError("Please enter a valid 3 or 4 digit CVC security code.");
      return;
    }

    if (!cardName.trim()) {
      setPaymentError("Please enter cardholder name.");
      return;
    }

    setCreditModalStep("processing");
    await new Promise(r => setTimeout(r, 2000));

    if (!session?.user?.id) {
      setPaymentError("Please sign in again before buying credits.");
      setCreditModalStep("payment");
      return;
    }
    try {
      const checkout = await purchaseCredits(session.user.id, selectedPkg.credits, "card");
      setCreditBalance(checkout.balance);
      void refreshCredits();
      setReceiptRef(checkout.checkout_reference);
      setReceiptTime(new Date());
      setReceiptLast4(cardNumber.replace(/\s/g, "").slice(-4));
      setReceiptAmount(checkout.amount);
      setReceiptPkgId(selectedPkg.id);
    } catch (err) {
      // A payment that did not go through must never add credits: say so and let the person try again.
      console.error("Checkout failed:", err);
      setPaymentError(err instanceof Error && err.message ? err.message : "Your purchase could not be completed. No credits were added. Please try again.");
      setCreditModalStep("payment");
      return;
    }

    setPurchasedCredits(selectedPkg.credits);
    setReceiptMethod(undefined);
    setCreditModalStep("success");
    announcePayment(selectedPkg.credits, selectedPkg.price);
  }

  async function handleProofSubmit(proof: ProofPayment) {
    setPaymentError("");
    if (!session?.user?.id) { setPaymentError("Sign in to upload a proof of payment."); return; }
    setCreditModalStep("processing");
    try {
      const { checkout, balance } = await payWithProof(session.user.id, selectedPkg, proof);
      setCreditBalance(balance);
      void refreshCredits();
      setReceiptRef(checkout.checkout_reference);
      setReceiptTime(new Date());
      setReceiptAmount(checkout.amount);
      setReceiptPkgId(selectedPkg.id);
      setPurchasedCredits(selectedPkg.credits);
      setReceiptMethod(`${PROOF_METHOD_LABEL[proof.method]} · proof uploaded`);
      setCreditModalStep("success");
      announcePayment(selectedPkg.credits, checkout.amount);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "We could not save your proof of payment. Try again.");
      setCreditModalStep("payment");
    }
  }

  // Settings: Password change states
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSuccessMsg, setPwSuccessMsg] = useState("");
  const [pwErrorMsg, setPwErrorMsg] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwErrorMsg("");
    setPwSuccessMsg("");
    const signsInWithPassword = (session?.user?.app_metadata?.providers as string[] | undefined)?.includes("email") ?? true;
    if (signsInWithPassword && !currentPw) {
      setPwErrorMsg("Please enter your current password.");
      return;
    }
    if (!isPasswordValid(newPw)) {
      setPwErrorMsg("Your new password needs at least 8 characters, with a lowercase letter, an uppercase letter, a number and a symbol.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwErrorMsg("New passwords do not match.");
      return;
    }
    if (signsInWithPassword && newPw === currentPw) {
      setPwErrorMsg("Your new password must be different from the current one.");
      return;
    }
    setPwLoading(true);
    try {
      if (signsInWithPassword) {
        const email = session?.user?.email;
        const { error: wrong } = email ? await supabase.auth.signInWithPassword({ email, password: currentPw }) : { error: new Error("no email") };
        if (wrong) { setPwErrorMsg("Your current password is incorrect."); return; }
      }
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) { setPwErrorMsg(passwordPolicyMessage(error) ?? (/session/i.test(error.message) ? "Your session has expired. Please sign in again." : error.message) ?? "We could not update your password. Please try again."); return; }
      setPwSuccessMsg("Your password has been updated successfully.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch {
      setPwErrorMsg("We could not reach the server. Check your connection and try again.");
    } finally {
      setPwLoading(false);
    }
  }

  useEffect(() => {
    if (!profileMenuOpen) return;
    function closeProfileMenu(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileMenuOpen(false);
    }
    document.addEventListener("mousedown", closeProfileMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeProfileMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileMenuOpen]);

  return (
    <div className="phase2-dashboard-shell min-h-full" style={{ background: activeNav === 'Academic Profile' ? '#f7f9ff' : '#f8f9ff' }}>

      {/* ── Top nav ── */}
      <DashboardHeader activeNav={activeNav} setActiveNav={setActiveNav} onNavigate={onNavigate} creditsLoading={creditsLoading} creditBalance={creditBalance} profile={profile} profileMenuOpen={profileMenuOpen} setProfileMenuOpen={setProfileMenuOpen} profileMenuRef={profileMenuRef} onLogout={onLogout} notifications={notifications} onMarkNotificationsRead={onMarkNotificationsRead} onOpenReport={onOpenReport} notifOpen={notifOpen} setNotifOpen={setNotifOpen} notifRef={notifRef} unreadCount={unreadCount} avatarUrl={avatarUrl} />

      {activeNav === "Settings" ? (
        <main className="uf" style={{ minHeight: "auto", background: "transparent" }}>
          <div className="uf-wrap" style={{ paddingTop: 28 }}>
            <div>
              <div className="uf-eb">Account</div>
              <h1 className="uf-h1">Settings</h1>
              <p className="uf-sub">Manage your account credentials, security and preferences.</p>
            </div>

            <div className="uf-settings">
              <nav className="uf-card uf-snav" aria-label="Settings sections">
                {([
                  ["settings-profile", "Profile", "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"],
                  ["settings-notifications", "Notifications", "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"],
                  ["settings-password", "Password", "M5 11h14v10H5zM8 11V7a4 4 0 018 0v4"],
                  ["credits", "Credits", "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v10M9 10h4.5a1.5 1.5 0 010 3H9.5a1.5 1.5 0 000 3H15"],
                ] as const).map(([id, label, icon]) => (
                  <button key={id} type="button" className={`uf-snav-item ${settingsSection === id ? "is-on" : ""}`}
                    onClick={() => {
                      if (id === "credits") { setActiveNav("Usage / Credits"); return; }
                      setSettingsSection(id);
                      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]" aria-hidden="true"><path d={icon} /></svg>
                    {label}
                  </button>
                ))}
              </nav>

              <div className="uf-col" style={{ gap: 20 }}>
                <div className="uf-two">
                  <section id="settings-profile" className="uf-card uf-block">
                    <header className="uf-block-head">
                      <span className="uf-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg></span>
                      <div><b>Profile information</b><div>Update your personal contact details and display name.</div></div>
                    </header>
                    <div className="uf-row-box">
                      <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <span className="uf-av">{(profile.fullName || "U").split(/\s+/).map(part => part[0]).join("").slice(0, 2).toLowerCase()}</span>
                        <span className="truncate">{profile.fullName}</span>
                      </span>
                      <button type="button" onClick={() => setActiveNav("Academic Profile")} className="uf-btn is-ghost is-sm">Open profile →</button>
                    </div>
                  </section>

                  <section id="settings-notifications" className="uf-card uf-block">
                    <header className="uf-block-head">
                      <span className="uf-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg></span>
                      <div><b>Notifications</b><div>Choose what this browser shows when a scan finishes or a payment goes through.</div></div>
                    </header>
                    {([
                      ["alerts", "Scan alerts", "A pop-up and a bell notification for finished scans and payments."],
                      ["sound", "Completion sound", "A short chime when a scan finishes."],
                    ] as const).map(([key, label, hint]) => {
                      const on = key === "sound" ? notificationPrefs.alerts && notificationPrefs.sound : notificationPrefs.alerts;
                      const disabled = key === "sound" && !notificationPrefs.alerts;
                      return (
                        <div key={key} className="uf-row-box">
                          <span style={{ minWidth: 0 }}>
                            <span id={`notif-${key}`} style={{ display: "block", fontWeight: 700, fontSize: 14 }}>{label}</span>
                            <span style={{ display: "block", fontSize: 12.5, color: "#6b6890", marginTop: 2 }}>{hint}</span>
                          </span>
                          <button type="button" role="switch" aria-checked={on} aria-labelledby={`notif-${key}`} disabled={disabled}
                            onClick={() => onNotificationPrefsChange?.({ ...notificationPrefs, [key]: !notificationPrefs[key] })}
                            className="uf-switch" data-on={on}>
                            <span className="uf-switch-knob" />
                            <span className="sr-only">{on ? "On" : "Off"}</span>
                          </button>
                        </div>
                      );
                    })}
                    <p style={{ margin: 0, fontSize: 12.5, color: "#7d7b9e" }}>Phone alerts are managed in the ReSync mobile app.</p>
                  </section>
                </div>

                <div id="settings-password">
                  <ChangePasswordCard pwSuccessMsg={pwSuccessMsg} pwErrorMsg={pwErrorMsg} currentPw={currentPw} setCurrentPw={setCurrentPw} newPw={newPw} setNewPw={setNewPw} confirmPw={confirmPw} setConfirmPw={setConfirmPw} showCurrentPw={showCurrentPw} setShowCurrentPw={setShowCurrentPw} showNewPw={showNewPw} setShowNewPw={setShowNewPw} showConfirmPw={showConfirmPw} setShowConfirmPw={setShowConfirmPw} pwLoading={pwLoading} handleUpdatePassword={handleUpdatePassword} />
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : activeNav === "Usage / Credits" ? (
        <CreditsPanel creditsLoading={creditsLoading} creditBalance={creditBalance} creditsUsed={creditsUsed} history={creditHistory} setPaymentError={setPaymentError} setCreditModalStep={setCreditModalStep} cardName={cardName} setCardName={setCardName} profile={profile} setShowBuyCreditsModal={setShowBuyCreditsModal} onNavigate={onNavigate} />
      ) : activeNav === "Academic Profile" ? (
        /* ═══════════════════════════════════════════════════
           ACADEMIC PROFILE VIEW (SIMPLIFIED)
        ═══════════════════════════════════════════════════ */
        <AcademicProfileView notice={profileNotice} savedAcademic={academicInfo} userId={session?.user?.id} credits={creditBalance} scansRun={creditsUsed} memberSince={session?.user?.created_at} setActiveNav={setActiveNav} editMode={editMode} setEditMode={setEditMode} profile={profile} draft={draft} setDraft={setDraft} saveProfile={saveProfile} cancelEdit={cancelEdit} avatarUrl={avatarUrl} avatarError={avatarError} handleAvatarFile={handleAvatarFile} removeAvatar={removeAvatar} />
      ) : (<>
<DashboardHome onNavigate={onNavigate} session={session} greeting={greeting} />
        <BackToTop />
      </>)}

      {/* ── Mock Payment Modal ── */}
      {showBuyCreditsModal && (
        <PaymentModal receiptMethod={receiptMethod} handleProofSubmit={handleProofSubmit} creditBalance={creditBalance} creditModalStep={creditModalStep} setCreditModalStep={setCreditModalStep} selectedPkgId={selectedPkgId} setSelectedPkgId={setSelectedPkgId} selectedPkg={selectedPkg} receiptRef={receiptRef} receiptTime={receiptTime} receiptLast4={receiptLast4} receiptAmount={receiptAmount} cardNumber={cardNumber} setCardNumber={setCardNumber} cardExpiry={cardExpiry} setCardExpiry={setCardExpiry} cardCvc={cardCvc} setCardCvc={setCardCvc} cardName={cardName} setCardName={setCardName} paymentError={paymentError} setPaymentError={setPaymentError} purchasedCredits={purchasedCredits} closeBuyCreditsModal={closeBuyCreditsModal} handlePaymentSubmit={handlePaymentSubmit} />
      )}
    </div>
  );
}
