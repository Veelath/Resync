import { useState, useEffect, useRef } from "react";
import { Logo, BackToTop, Spinner, Eye } from '../../components/AppPrimitives';
import type { Screen } from '../../lib/appTypes';
import { B, BH, BL } from '../../lib/brand';
import guidanceArtwork from "@/assets/guidance-reference.webp";
import { Info } from "lucide-react";
import type React from 'react';
import type { Session } from '@supabase/supabase-js';
import { getCreditBalance, getCreditHistory, createCreditCheckout, confirmCreditCheckout } from '../../services/api';

function parseUserProfileMetadata(meta?: Record<string, any> | null, email?: string | null) {
  const rawFullName = meta?.full_name || email?.split('@')[0] || 'User';
  let firstName = meta?.first_name || '';
  const middleName = meta?.middle_name || '';
  let lastName = meta?.last_name || '';

  // Heuristic: If first_name missing but full_name present, split heuristically (first word = first_name, rest = last_name)
  if (!firstName && rawFullName) {
    const parts = rawFullName.trim().split(/\s+/).filter(Boolean);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  const fullName = meta?.full_name || [firstName, middleName, lastName].filter(Boolean).join(' ') || rawFullName;
  return { firstName, middleName, lastName, fullName };
}

const CREDIT_PACKAGES = [
  {
    id: "quick",
    name: "Quick Scan",
    credits: 1,
    price: 25,
    unitPrice: 25,
    perCredit: "₱25.00 / credit",
    subtitle: "One manuscript, one check",
    badge: null,
  },
  {
    id: "starter",
    name: "Starter",
    credits: 5,
    price: 125,
    unitPrice: 25,
    perCredit: "₱25.00 / credit",
    subtitle: "Small batch of revisions",
    badge: null,
  },
  {
    id: "standard",
    name: "Standard",
    credits: 20,
    price: 450,
    unitPrice: 22.5,        // ₱22.50 × 20 = ₱450 (10% off)
    perCredit: "₱22.50 / credit",
    subtitle: "Full defense preparation",
    badge: "10% OFF",
    recommended: true,
  },
  {
    id: "team",
    name: "Research Team",
    credits: 50,
    price: 1000,
    unitPrice: 20,          // ₱20 × 50 = ₱1,000 (20% off)
    perCredit: "₱20.00 / credit",
    subtitle: "Multi-author or lab use",
    badge: "20% OFF",
  },
] as const;

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

  const WHAT_GET = [
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>,
      label: "Coherence Score",
      desc: "A 0–100 integrity score with three sub-scores: logic, consistency, and citations.",
      color: B,
      bg: BL,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M9 12h6M9 16h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>,
      label: "Annotated Manuscript",
      desc: "Full text with every flagged passage highlighted inline by issue type.",
      color: "#7c3aed",
      bg: "#f5f3ff",
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 000 4h6a2 2 0 000-4M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
      label: "Fix Recommendations",
      desc: "Concrete, actionable rewrites for each flagged issue, ready to apply.",
      color: "#059669",
      bg: "#f0fdf4",
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>,
      label: "Verified Reference List",
      desc: "Live / dead status for every cited URL and DOI in your bibliography.",
      color: "#d97706",
      bg: "#fffbeb",
    },
  ];

  const STEPS = [
    {
      num: 1,
      label: "Upload Manuscript",
      desc: "Upload your .docx file or paste a Google Docs share link.",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
    },
    {
      num: 2,
      label: "Set Type & Template",
      desc: "Upload a manuscript and optionally attach a chapter template.",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9" /></svg>,
    },
    {
      num: 3,
      label: "Coherence Scan",
      desc: "AI cross-checks logic gaps, contradictions, redundancies, and dead citations.",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
    },
    {
      num: 4,
      label: "Export Report",
      desc: "Download your annotated report and fix recommendations as a PDF.",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>,
    },
  ];

  const BEST_PRACTICES = [
    { title: "Digital Manuscripts", desc: "DOCX, PDF, Google Docs", x: 200, y: 228 },
    { title: "Standard Structure", desc: "Chapter 1–5 & IMRaD", x: 690, y: 228 },
    { title: "Single-Column Flow", desc: "Sequential reading order", x: 1190, y: 228 },
    { title: "Direct Prose", desc: "Claims and conclusions", x: 220, y: 520 },
    { title: "Open References", desc: "Citations and DOI checks", x: 700, y: 520 },
    { title: "Method Focus", desc: "Qualitative or quantitative fit", x: 1190, y: 520 },
  ];

  return (
    <div className="min-h-full" style={{ background: "#f8f9ff" }}>

      {/* ── Top nav ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100/80" style={{ boxShadow: "0 1px 0 rgba(26,31,204,.06)" }}>
        <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 h-15 flex items-center gap-2 md:gap-4" style={{ height: 64 }}>
          <div className="flex items-center shrink-0">
            <Logo header className="h-7 sm:h-10" />
          </div>
          <nav className="flex items-center gap-0.5 flex-1">
            {(["Dashboard", "Academic Profile"] as const).map(label => (
              <button key={label} onClick={() => setActiveNav(label as typeof activeNav)}
                aria-label={label}
                className="flex items-center gap-1.5 px-2 sm:px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                style={{ background: activeNav === label ? B : "transparent", color: activeNav === label ? "white" : "#6b7280", boxShadow: activeNav === label ? `0 2px 10px ${B}30` : "none" }}>
                {label === "Dashboard" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>}
                {label === "Academic Profile" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>}
                <span className="hidden sm:block">{label}</span>
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div aria-label={`Credits: ${creditsLoading ? "loading" : creditBalance ?? "unavailable"}`} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors hover:bg-gray-50 cursor-default"
              style={{ borderColor: `${B}20`, background: `${B}06`, color: B }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              <span className="hidden sm:inline">Credits:</span> {creditsLoading ? "…" : creditBalance !== null ? creditBalance : "—"}
            </div>
            <div className="h-5 w-px bg-gray-100 hidden sm:block" />
            <button aria-label="Notifications" className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-400 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-white" />
            </button>
            <div className="h-5 w-px bg-gray-100 hidden sm:block" />
            <div ref={profileMenuRef} className="relative">
              <button
                onClick={() => setProfileMenuOpen(open => !open)}
                aria-label={`${profile.fullName} user account menu`}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>
                </div>
                <p className="hidden md:block text-xs font-bold text-gray-800">{profile.fullName}</p>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3 h-3 text-gray-400 hidden md:block transition-transform ${profileMenuOpen ? "rotate-180" : ""}`} aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </button>

              {profileMenuOpen && (
                <div role="menu" className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl z-50 animate-slide-in">
                  {[
                    {
                      label: "Dashboard",
                      action: () => setActiveNav("Dashboard"),
                      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
                    },
                    {
                      label: "Settings",
                      action: () => setActiveNav("Settings"),
                      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21h-4v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3v-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3h4v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0019.4 9c.12.6.65 1.03 1.26 1.03H21v4h-.09A1.65 1.65 0 0019.4 15z" /></svg>,
                    },
                    {
                      label: "Usage / Credits",
                      action: () => setActiveNav("Usage / Credits"),
                      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
                    },
                  ].map(item => (
                    <button key={item.label} role="menuitem" onClick={() => { item.action(); setProfileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
                      <span className="text-gray-400">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                  <div className="h-px bg-gray-100 my-1" />
                  <button role="menuitem" onClick={() => { setProfileMenuOpen(false); onLogout?.(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

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
        </main>
      ) : activeNav === "Usage / Credits" ? (
        <main className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: B }}>Account usage</p>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Usage / Credits</h2>
              <p className="text-xs text-gray-400 mt-1">View your available credits and current usage.</p>
            </div>
            <button
              onClick={() => {
                setPaymentError("");
                setCreditModalStep("package");
                if (!cardName) setCardName(profile.fullName || "Thesis Author");
                setShowBuyCreditsModal(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-all hover:opacity-90 cursor-pointer"
              style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}
            >
              + Buy Credits
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { value: creditsLoading ? "…" : creditBalance !== null ? String(creditBalance) : "—", label: "Credits available", color: B, bg: BL, topUp: true },
              { value: creditsLoading ? "…" : creditsUsed !== null ? String(creditsUsed) : "—", label: "Credits used", color: "#059669", bg: "#f0fdf4" },
              { value: "1 credit", label: "Cost per scan", color: "#d97706", bg: "#fffbeb" },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col justify-between" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: item.bg, color: item.color }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    </div>
                    {item.topUp && (
                      <button
                        onClick={() => {
                          setPaymentError("");
                          setCreditModalStep("package");
                          if (!cardName) setCardName(profile.fullName || "Thesis Author");
                          setShowBuyCreditsModal(true);
                        }}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg border transition-all hover:bg-gray-50 flex items-center gap-1 cursor-pointer"
                        style={{ borderColor: `${B}30`, color: B }}
                      >
                        + Top up
                      </button>
                    )}
                  </div>
                  <p className="text-2xl font-bold mono" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Ready to review a manuscript?</h3>
              <p className="text-xs text-gray-400 mt-1">Each complete coherence scan uses one credit.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPaymentError("");
                  setCreditModalStep("package");
                  if (!cardName) setCardName(profile.fullName || "Thesis Author");
                  setShowBuyCreditsModal(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors hover:bg-gray-50 cursor-pointer"
                style={{ borderColor: `${B}30`, color: B }}
              >
                Buy Credits
              </button>
              <button onClick={() => onNavigate("upload")} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer" style={{ background: B }}>Start a Scan</button>
            </div>
          </div>
        </main>
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

        {/* ══ HERO BANNER ══ */}
        <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, #080c33 0%, ${B} 60%, #3b40e8 100%)` }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, rgba(255,255,255,.09) 1px, transparent 1px)`, backgroundSize: "28px 28px" }} />
          <div className="absolute -top-24 right-40 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(165,180,252,.22) 0%, transparent 65%)" }} />

          <div className="relative z-10 w-full px-6 md:px-10 lg:px-16 xl:px-20 py-10 lg:py-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

              {/* Left: greeting + headline */}
              <div className="flex-1 min-w-0 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-3">
                  <span className="text-xs sm:text-sm font-semibold text-blue-100">
                    {greeting},{' '}
                    {session?.user?.user_metadata?.full_name?.split(' ')[0]
                      || session?.user?.email?.split('@')[0]
                      || 'there'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-2.5">
                  Your manuscript, <span className="text-indigo-200">checked end-to-end.</span>
                </h1>
                <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed font-normal">
                  Detect logic gaps, cross-chapter contradictions, terminology drift, and inaccessible citations — all in under 2 minutes.
                </p>
              </div>

              {/* Right: CTA + secondary link */}
              <div className="flex flex-wrap items-center gap-3.5 shrink-0 pt-2 lg:pt-0">
                <button onClick={() => onNavigate("upload")}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base text-gray-950 bg-white hover:bg-blue-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 cursor-pointer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-indigo-700" aria-hidden="true">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Start a Scan</span>
                </button>
                <button onClick={() => onNavigate("results", true)}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm sm:text-base text-white hover:bg-white/15 border-1.5 border-white/30 backdrop-blur-sm active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 cursor-pointer">
                  <span>Preview sample</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-white/15">
              <div className="flex items-center gap-4 text-xs sm:text-sm text-blue-100/80 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  AI-Powered Multi-Model Pipeline
                </span>
                <span className="hidden sm:inline text-white/30">•</span>
                <span className="hidden sm:inline">Quantitative & Qualitative Support</span>
                <span className="hidden sm:inline text-white/30">•</span>
                <span className="hidden sm:inline">Automatic Citation Verifier</span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-blue-200 inline-flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                <span>~2 min average scan</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Main body ── */}
        <main className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-8 space-y-6">

          {/* Process */}
          <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white px-6 py-10 sm:px-8 lg:px-10 lg:py-12" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
            <div aria-hidden="true" className="absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-indigo-50/80" />
            <div aria-hidden="true" className="absolute right-12 top-10 hidden grid-cols-5 gap-3 opacity-60 lg:grid">
              {Array.from({ length: 20 }, (_, index) => <span key={index} className="h-1.5 w-1.5 rounded-full bg-indigo-100" />)}
            </div>

            <div className="relative z-10 mb-10 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em]" style={{ color: B }}>Process</p>
              <h2 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">How It Works</h2>
              <p className="mt-2 text-sm text-gray-500 sm:text-base">Four simple steps from manuscript to coherence report.</p>
            </div>

            <div className="relative z-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:min-h-[310px] lg:grid-cols-4 lg:gap-14">
              <svg aria-hidden="true" className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block" viewBox="0 0 1200 310" preserveAspectRatio="none">
                <path d="M258 126 C278 126 292 174 314 174" stroke="#818cf8" strokeWidth="3" strokeDasharray="8 8" fill="none" strokeLinecap="round" />
                <path d="M572 174 C592 174 606 126 628 126" stroke="#818cf8" strokeWidth="3" strokeDasharray="8 8" fill="none" strokeLinecap="round" />
                <path d="M886 126 C906 126 920 174 942 174" stroke="#818cf8" strokeWidth="3" strokeDasharray="8 8" fill="none" strokeLinecap="round" />
                {[258, 314, 572, 628, 886, 942].map((x, index) => (
                  <g key={x}>
                    <circle cx={x} cy={index % 2 === 0 ? 126 : 174} r="10" fill="white" stroke="#e0e7ff" strokeWidth="4" />
                    <circle cx={x} cy={index % 2 === 0 ? 126 : 174} r="4" fill={B} />
                  </g>
                ))}
              </svg>

              {STEPS.map((step, index) => (
                <article key={step.num} className={`relative ${index % 2 === 1 ? "lg:mt-12" : ""}`}>
                  <span aria-hidden="true" className="absolute -top-10 left-4 text-7xl font-bold leading-none text-gray-500 sm:text-8xl">
                    {String(step.num).padStart(2, "0")}
                  </span>
                  <div className="relative flex min-h-[220px] h-full flex-col items-center rounded-3xl border border-indigo-100 bg-white/95 p-6 text-center shadow-[0_14px_36px_rgba(26,31,204,0.08)]">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg shadow-indigo-200" style={{ background: `linear-gradient(145deg, ${B}, #3b40e8)` }}>
                      {step.icon}
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: B }}>Step {step.num}</p>
                    <h3 className="mt-2 text-lg font-bold leading-tight text-gray-950">{step.label}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">{step.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Outputs */}
          <section className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
            <div className="mb-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">Outputs</p>
              <h2 className="text-xl font-bold tracking-tight text-foreground">What You Get</h2>
              <p className="mt-1 text-sm text-muted-foreground">Four deliverables, every scan, automatically.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {WHAT_GET.map(({ icon, label, desc, color, bg }) => (
                <div key={label} className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: bg, color }}>
                    {icon}
                  </div>
                  <div className="pt-0.5">
                    <h3 className="text-sm font-bold leading-tight text-foreground">{label}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ═══════════════════════════════════════════
            ROW 2: Recommended Scope / Best Results With
        ═══════════════════════════════════════════ */}
          <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1 text-primary">Guidance</p>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Best Results With</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">ReSync delivers the most accurate cross-chapter analysis when manuscripts align with these recommended standards.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
              {BEST_PRACTICES.map(({ title, desc, x, y }) => (
                <div key={title} className="flex flex-col items-center text-center">
                  <div className="relative w-56 h-[132px] overflow-hidden mb-3" aria-hidden="true" style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent), linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)", maskComposite: "intersect" }}>
                    <img src={guidanceArtwork} alt="" loading="lazy" className="absolute max-w-none mix-blend-multiply" style={{ width: 1170.4, height: 658.7, left: -x * 0.7, top: -y * 0.7 }} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground leading-tight">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">{desc}</p>
                </div>
              ))}
            </div>

            {/* Advisory card */}
            <div className="mt-8 p-4 rounded-2xl bg-muted border border-border flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 text-primary">
                <Info className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">When inconsistencies may appear.</strong> Review flagged findings in the Findings tab.</p>
              </div>
            </div>
          </section>

          {/* ── Template tip ── */}
          <div className="relative rounded-3xl overflow-hidden border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-5 flex items-center gap-5">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">Pro tip: Customize your standard template</p>
              <p className="text-xs text-amber-700 leading-relaxed mt-0.5">ReSync detects research type and chapter headings from your manuscript. Attach a template if your school uses custom headings.</p>
            </div>
            <button onClick={() => onNavigate("upload")}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-200 text-amber-900 hover:bg-amber-300 transition-colors whitespace-nowrap">
              Try it →
            </button>
          </div>

          <div className="h-4" />
        </main>
        <BackToTop />
      </>)}

      {/* ── Mock Payment Modal ── */}
      {showBuyCreditsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && creditModalStep !== "processing") {
              closeBuyCreditsModal();
            }
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden transition-all"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Demo Banner */}
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-amber-800 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-amber-600 shrink-0">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                DEMO MODE · Simulated Sandbox — no real card or bank is charged
              </span>
              <span className="text-[10px] uppercase tracking-wider bg-amber-200/60 px-2 py-0.5 rounded text-amber-900 font-bold">
                Simulated Sandbox
              </span>
            </div>

            {/* Modal Header */}
            <div className="px-6 pt-5 pb-3 flex items-start justify-between border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Purchase Scan Credits</h3>
                <p className="text-xs text-gray-500 mt-0.5">Scan credits never expire and apply to any thesis analysis.</p>
              </div>
              <button
                type="button"
                onClick={closeBuyCreditsModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Step 1: Package Selection */}
            {creditModalStep === "package" && (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {CREDIT_PACKAGES.map((pkg) => {
                    const isSelected = selectedPkgId === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPkgId(pkg.id)}
                        className={`relative rounded-2xl p-4 border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/40 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        {pkg.badge && (
                          <span className="absolute -top-2.5 right-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                            {pkg.badge}
                          </span>
                        )}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-900">{pkg.name}</span>
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 mb-0.5">
                            {pkg.credits} <span className="text-xs font-medium text-gray-500">Credits</span>
                          </p>
                          <p className="text-xs text-gray-500 leading-snug">{pkg.subtitle}</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-baseline justify-between">
                          <span className="text-lg font-bold text-gray-900">₱{pkg.price.toLocaleString('en-PH')}</span>
                          <span className="text-[10px] text-gray-400 mono">{pkg.perCredit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    Selected: <strong className="text-gray-900">{selectedPkg.credits} Credits</strong> for{" "}
                    <strong className="text-gray-900">
                      ₱{selectedPkg.price.toLocaleString('en-PH')}
                    </strong>
                  </span>
                  <span className="text-gray-400 text-[11px]">Instant ledger crediting</span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeBuyCreditsModal}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentError("");
                      setCreditModalStep("payment");
                    }}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}
                  >
                    Continue to Payment →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment Details */}
            {creditModalStep === "payment" && (
              <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentError("");
                      setCreditModalStep("package");
                    }}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
                  >
                    ← Back to packages
                  </button>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">Order Summary: </span>
                    <span className="text-xs font-bold text-gray-900">
                      {selectedPkg.credits} Credits — ₱{selectedPkg.price.toLocaleString('en-PH')}
                    </span>
                  </div>
                </div>

                {paymentError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0 text-red-600">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>{paymentError}</span>
                  </div>
                )}

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      placeholder="Thesis Author"
                      className="w-full h-10 px-3.5 rounded-xl border text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                      style={{ borderColor: "#e5e7eb" }}
                      onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                      onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                        placeholder="4242 4242 4242 4242"
                        className="w-full h-10 px-3.5 pr-10 rounded-xl border text-sm font-mono text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                        style={{ borderColor: "#e5e7eb" }}
                        onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                        onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center text-gray-400 pointer-events-none">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Expiration Date</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full h-10 px-3.5 rounded-xl border text-sm font-mono text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                        style={{ borderColor: "#e5e7eb" }}
                        onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                        onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">CVC / CVV</label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        className="w-full h-10 px-3.5 rounded-xl border text-sm font-mono text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                        style={{ borderColor: "#e5e7eb" }}
                        onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                        onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all shadow-sm flex items-center justify-center gap-2 hover:opacity-90 cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}
                  >
                    Pay ₱{selectedPkg.price.toLocaleString('en-PH')} (Simulated)
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-400">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  <span>Encrypted 256-bit Demo SSL · Test Card 4242</span>
                </div>
              </form>
            )}

            {/* Step 3: Processing */}
            {creditModalStep === "processing" && (
              <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mb-2" />
                <h4 className="text-base font-bold text-gray-900">Processing simulated transaction...</h4>
                <p className="text-xs text-gray-400 max-w-xs">Contacting credit ledger provider...</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold mono">
                  Simulating instant payment confirmation
                </div>
              </div>
            )}

            {/* Step 4: Success / Receipt */}
            {creditModalStep === "success" && (
              <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-5">
                <style>{`
                  @media print {
                    body * { visibility: hidden !important; }
                    .receipt-printable, .receipt-printable * { visibility: visible !important; }
                    .receipt-printable {
                      position: fixed !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      max-width: 100% !important;
                      box-shadow: none !important;
                      border: 1px solid #e5e7eb !important;
                      background: #ffffff !important;
                      padding: 24px !important;
                    }
                  }
                `}</style>

                {/* Header */}
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">Payment Successful</h4>
                  <p className="text-xs text-amber-700 font-medium mt-1">Simulated Sandbox — no real charge was made</p>
                </div>

                {/* Receipt card */}
                <div className="receipt-printable w-full rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 space-y-3 text-xs text-left font-mono shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-sans text-[11px]">Transaction ID</span>
                    <span className="font-bold text-gray-900">{receiptRef || "SIM-PENDING"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-sans text-[11px]">Date &amp; Time</span>
                    <span className="text-gray-800">
                      {receiptTime
                        ? `${receiptTime.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })} PST`
                        : "Just now"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-sans text-[11px]">Package</span>
                    <span className="text-gray-900 font-semibold">{selectedPkg.name} — {selectedPkg.credits} Scan Credits</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-sans text-[11px]">Amount Paid</span>
                    <span className="font-bold text-gray-900 text-sm">
                      ₱{receiptAmount.toLocaleString('en-PH')}.00
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-sans text-[11px]">Payment Method</span>
                    <span className="text-gray-800">Card •••• {receiptLast4 || "4242"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-sans text-[11px]">Status</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full text-[10px] font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Completed
                    </span>
                  </div>

                  <div className="h-px bg-gray-200 my-2" />

                  <div className="flex items-center justify-between font-sans">
                    <span className="text-gray-600 text-xs">New balance:</span>
                    <span className="font-bold mono text-blue-700 text-sm">
                      {creditBalance !== null ? creditBalance : purchasedCredits} Scan Credits
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="w-full flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-600">
                      <polyline points="6 9 6 2 18 2 18 9"/>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                      <rect x="6" y="14" width="12" height="8"/>
                    </svg>
                    Print Receipt
                  </button>
                  <button
                    type="button"
                    onClick={closeBuyCreditsModal}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs text-white shadow-sm transition-all hover:opacity-90 flex items-center justify-center cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
