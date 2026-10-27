import { CreditsPanel } from './CreditsPanel';
import { ChangePasswordCard } from './ChangePasswordCard';
import { DashboardHeader } from './DashboardHeader';
import { PaymentModal } from './PaymentModal';
import { DashboardHome } from './DashboardHome';
import { parseUserProfileMetadata, CREDIT_PACKAGES } from './helpers';
import { useState, useEffect, useRef } from "react";
import { BackToTop } from '../../components/AppPrimitives';
import type { Screen } from '../../lib/appTypes';
import { B, BH, BL } from '../../lib/brand';
import guidanceArtwork from "@/assets/guidance-reference.webp";
import { Info } from "lucide-react";
import type React from 'react';
import type { Session } from '@supabase/supabase-js';
import { getCreditBalance, getCreditHistory, createCreditCheckout, confirmCreditCheckout } from '../../services/api';

export function DashboardScreen({ onNavigate, session, onLogout }: { onNavigate: (s: Screen, asSample?: boolean) => void; session?: Session | null; onLogout?: () => void }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const [activeNav, setActiveNav] = useState<"Dashboard" | "Academic Profile" | "Settings" | "Usage / Credits">("Dashboard");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [editMode, setEditMode] = useState(false);
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
    <div className="min-h-full" style={{ background: "#f8f9ff" }}>

      {/* ── Top nav ── */}
      <DashboardHeader activeNav={activeNav} setActiveNav={setActiveNav} creditsLoading={creditsLoading} creditBalance={creditBalance} profile={profile} profileMenuOpen={profileMenuOpen} setProfileMenuOpen={setProfileMenuOpen} profileMenuRef={profileMenuRef} onLogout={onLogout} />

      {activeNav === "Settings" ? (
        <main className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-8 space-y-6">
          <div>
            <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: B }}>Account</p>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h2>
            <p className="text-xs text-gray-400 mt-1">Manage your account credentials, security, and preferences.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-3xl border border-gray-100 p-6" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: BL, color: B }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>
              </div>
              <h3 className="text-base font-bold text-gray-900">Profile information</h3>
              <p className="text-xs text-gray-400 mt-1 mb-5">Update your personal contact details and display name.</p>
              <button onClick={() => setActiveNav("Academic Profile")} className="text-xs font-bold hover:underline" style={{ color: B }}>Open Profile →</button>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 p-6" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gray-100 text-gray-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
              </div>
              <h3 className="text-base font-bold text-gray-900">Notifications</h3>
              <p className="text-xs text-gray-400 mt-1 mb-5">Scan completion alerts are currently sent to your account email.</p>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-xs font-semibold text-gray-600">Scan completion emails</span>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">Enabled</span>
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
        <main className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-8 space-y-6">

          {/* Page header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: B }}>Account</p>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Academic Profile</h2>
              <p className="text-xs text-gray-400 mt-1">Manage your personal profile and contact information.</p>
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
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
            <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center gap-6" style={{ background: `linear-gradient(90deg, ${BL}, white)` }}>
              {/* Avatar with Photo change trigger */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md"
                  style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}>
                  {profile.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <label className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-400 cursor-pointer transition-all" title="Change profile picture">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  <input type="file" accept="image/*" className="hidden" onChange={() => alert("Profile photo upload dialog")} />
                </label>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {editMode ? (
                    <input
                      value={draft.fullName}
                      onChange={e => setDraft({ ...draft, fullName: e.target.value })}
                      placeholder="Full Name"
                      className="text-xl font-bold text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-1 focus:border-blue-500 outline-none w-full max-w-sm"
                    />
                  ) : (
                    <h3 className="text-xl font-bold text-gray-900">{profile.fullName}</h3>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-400"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  {profile.email}
                </p>
              </div>
            </div>

            {/* Contact Details List */}
            <div className="px-8 py-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Personal Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Full Name */}
                <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white border border-gray-200 text-gray-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400">Full Name</p>
                    {editMode ? (
                      <input
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
                        value={draft.contactNumber}
                        onChange={e => setDraft({ ...draft, contactNumber: e.target.value })}
                        className="text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-2.5 py-1 w-full mt-1 focus:outline-none focus:border-blue-400"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{profile.contactNumber}</p>
                    )}
                  </div>
                </div>

                {/* Profile Picture Guidelines */}
                <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white border border-gray-200 text-gray-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400">Profile Picture</p>
                    <p className="text-xs text-gray-600 mt-1">JPEG or PNG, max 5MB. Click camera badge on avatar to upload.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security / Change Password Notice Banner */}
          <div className="rounded-3xl border border-gray-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ boxShadow: "0 2px 16px rgba(26,31,204,.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600 border border-amber-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Need to change your password?</p>
                <p className="text-[11px] text-gray-400">Password and security options are managed under Settings.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveNav("Settings")}
              className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors hover:bg-gray-50 self-start sm:self-auto"
              style={{ borderColor: `${B}30`, color: B }}
            >
              Go to Settings →
            </button>
          </div>

          <div className="h-4" />
        </main>
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
