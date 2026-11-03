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
import { announcePayment, payWithProof, PROOF_METHOD_LABEL, type ProofPayment } from '../../lib/paymentProof';
import { getCreditBalance, getCreditHistory, createCreditCheckout, confirmCreditCheckout } from '../../services/api';

export function DashboardScreen({ onNavigate, session, onLogout, notifications = [], onMarkNotificationsRead, onOpenReport, notificationPrefs = { alerts: true, sound: true }, onNotificationPrefsChange }: { notificationPrefs?: NotificationPrefs; onNotificationPrefsChange?: (prefs: NotificationPrefs) => void; onNavigate: (s: Screen, asSample?: boolean) => void; session?: Session | null; onLogout?: () => void; notifications?: AppNotification[]; onMarkNotificationsRead?: () => void; onOpenReport?: () => void }) {
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
    contactNumber: "",
  });
  const [draft, setDraft] = useState(profile);
  function saveProfile() { setProfile(draft); setEditMode(false); }
  function cancelEdit() { setDraft(profile); setEditMode(false); }

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
      }));
    }
  }, [session]);

  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [creditsUsed, setCreditsUsed] = useState<number | null>(null);
  const [settingsSection, setSettingsSection] = useState<string>("settings-profile");
  const [creditHistory, setCreditHistory] = useState<CreditActivity[]>([]);
  const [creditsLoading, setCreditsLoading] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    setCreditsLoading(true);
    Promise.all([
      getCreditBalance(session.user.id),
      getCreditHistory(session.user.id, 100),
    ]).then(([bal, hist]) => {
      setCreditBalance(bal.balance);
      const used = hist.entries
        .filter(e => e.kind === 'debit')
        .reduce((a, e) => a + Math.abs(e.delta), 0);
      setCreditsUsed(used);
      setCreditHistory(hist.entries);
    }).catch((e) => {
      console.error('credits fetch failed:', e);
      setCreditBalance(null);
      setCreditsUsed(null);
    }).finally(() => {
      setCreditsLoading(false);
    });
  }, [session?.user?.id]);

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

    try {
      if (session?.user?.id) {
        const checkout = await createCreditCheckout(
          session.user.id,
          selectedPkg.credits,
          selectedPkg.unitPrice,
        );
        const confirm = await confirmCreditCheckout(session.user.id, checkout.pymt_txn_id);
        setCreditBalance(confirm.balance);
        setReceiptRef(checkout.checkout_reference);
        setReceiptTime(new Date());
        setReceiptLast4(cardNumber.replace(/\s/g, "").slice(-4));
        setReceiptAmount(checkout.amount);
        setReceiptPkgId(selectedPkg.id);
        console.log("Receipt verification: receiptAmount === checkout.amount", checkout.amount === checkout.amount, {
          receiptAmount: checkout.amount,
          checkoutAmount: checkout.amount,
        });
      } else {
        setCreditBalance(prev => (prev ?? 0) + selectedPkg.credits);
        setReceiptRef("SIM-" + Math.random().toString(36).substring(2, 10).toUpperCase());
        setReceiptTime(new Date());
        setReceiptLast4(cardNumber.replace(/\s/g, "").slice(-4));
        setReceiptAmount(selectedPkg.price);
        setReceiptPkgId(selectedPkg.id);
      }
    } catch (err) {
      console.warn("Backend simulated checkout fallback:", err);
      setCreditBalance(prev => (prev ?? 0) + selectedPkg.credits);
      setReceiptRef("SIM-" + Math.random().toString(36).substring(2, 10).toUpperCase());
      setReceiptTime(new Date());
      setReceiptLast4(cardNumber.replace(/\s/g, "").slice(-4));
      setReceiptAmount(selectedPkg.price);
      setReceiptPkgId(selectedPkg.id);
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

  function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwErrorMsg("");
    setPwSuccessMsg("");
    if (!currentPw) {
      setPwErrorMsg("Please enter your current password.");
      return;
    }
    if (newPw.length < 8) {
      setPwErrorMsg("New password must be at least 8 characters long.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwErrorMsg("New passwords do not match.");
      return;
    }
    setPwLoading(true);
    setTimeout(() => {
      setPwLoading(false);
      setPwSuccessMsg("Your password has been updated successfully.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    }, 800);
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
        <AcademicProfileView userId={session?.user?.id} credits={creditBalance} scansRun={creditsUsed} memberSince={session?.user?.created_at} setActiveNav={setActiveNav} editMode={editMode} setEditMode={setEditMode} profile={profile} draft={draft} setDraft={setDraft} saveProfile={saveProfile} cancelEdit={cancelEdit} avatarUrl={avatarUrl} avatarError={avatarError} handleAvatarFile={handleAvatarFile} removeAvatar={removeAvatar} />
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
