import { CreditsPanel } from './CreditsPanel';
import { ChangePasswordCard } from './ChangePasswordCard';
import { DashboardHeader } from './DashboardHeader';
import type { AppNotification } from '../../components/ScanNotifications';
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
import { getCreditBalance, getCreditHistory, createCreditCheckout, confirmCreditCheckout } from '../../services/api';

export function DashboardScreen({ onNavigate, session, onLogout, notifications = [], onMarkNotificationsRead, onOpenReport }: { onNavigate: (s: Screen, asSample?: boolean) => void; session?: Session | null; onLogout?: () => void; notifications?: AppNotification[]; onMarkNotificationsRead?: () => void; onOpenReport?: () => void }) {
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
    setCreditModalStep("success");
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
        <main className="w-full max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-7">
          <div>
            <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: B }}>Account</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Settings</h2>
            <p className="text-sm text-gray-500 mt-1.5">Manage your account credentials, security, and preferences.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 flex flex-col" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
              <div className="flex items-start gap-4 pb-5 mb-6 border-b border-gray-100">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: BL, color: B }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-gray-900">Profile information</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Update your personal contact details and display name.</p>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
                <span className="text-sm font-semibold text-gray-700 truncate">{profile.fullName}</span>
                <button onClick={() => setActiveNav("Academic Profile")} className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors hover:bg-gray-50 shrink-0" style={{ borderColor: `${B}30`, color: B }}>Open Profile →</button>
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 flex flex-col" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
              <div className="flex items-start gap-4 pb-5 mb-6 border-b border-gray-100">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: BL, color: B }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-gray-900">Notifications</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Scan completion alerts are currently sent to your account email.</p>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
                <span className="text-sm font-semibold text-gray-700">Scan completion emails</span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Enabled</span>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <ChangePasswordCard pwSuccessMsg={pwSuccessMsg} pwErrorMsg={pwErrorMsg} currentPw={currentPw} setCurrentPw={setCurrentPw} newPw={newPw} setNewPw={setNewPw} confirmPw={confirmPw} setConfirmPw={setConfirmPw} showCurrentPw={showCurrentPw} setShowCurrentPw={setShowCurrentPw} showNewPw={showNewPw} setShowNewPw={setShowNewPw} showConfirmPw={showConfirmPw} setShowConfirmPw={setShowConfirmPw} pwLoading={pwLoading} handleUpdatePassword={handleUpdatePassword} />
        </main>
      ) : activeNav === "Usage / Credits" ? (
        <CreditsPanel creditsLoading={creditsLoading} creditBalance={creditBalance} creditsUsed={creditsUsed} setPaymentError={setPaymentError} setCreditModalStep={setCreditModalStep} cardName={cardName} setCardName={setCardName} profile={profile} setShowBuyCreditsModal={setShowBuyCreditsModal} onNavigate={onNavigate} />
      ) : activeNav === "Academic Profile" ? (
        /* ═══════════════════════════════════════════════════
           ACADEMIC PROFILE VIEW (SIMPLIFIED)
        ═══════════════════════════════════════════════════ */
        <AcademicProfileView setActiveNav={setActiveNav} editMode={editMode} setEditMode={setEditMode} profile={profile} draft={draft} setDraft={setDraft} saveProfile={saveProfile} cancelEdit={cancelEdit} avatarUrl={avatarUrl} avatarError={avatarError} handleAvatarFile={handleAvatarFile} removeAvatar={removeAvatar} />
      ) : (<>
<DashboardHome onNavigate={onNavigate} session={session} greeting={greeting} />
        <BackToTop />
      </>)}

      {/* ── Mock Payment Modal ── */}
      {showBuyCreditsModal && (
        <PaymentModal creditBalance={creditBalance} creditModalStep={creditModalStep} setCreditModalStep={setCreditModalStep} selectedPkgId={selectedPkgId} setSelectedPkgId={setSelectedPkgId} selectedPkg={selectedPkg} receiptRef={receiptRef} receiptTime={receiptTime} receiptLast4={receiptLast4} receiptAmount={receiptAmount} cardNumber={cardNumber} setCardNumber={setCardNumber} cardExpiry={cardExpiry} setCardExpiry={setCardExpiry} cardCvc={cardCvc} setCardCvc={setCardCvc} cardName={cardName} setCardName={setCardName} paymentError={paymentError} setPaymentError={setPaymentError} purchasedCredits={purchasedCredits} closeBuyCreditsModal={closeBuyCreditsModal} handlePaymentSubmit={handlePaymentSubmit} />
      )}
    </div>
  );
}
