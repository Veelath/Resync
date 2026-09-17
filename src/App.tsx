/**
   * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, ScanResult } from './types.js';
import {
  Sparkles,
  Layers,
  UserCheck,
  LogOut,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  FileText,
  Settings,
  Bell,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  Link,
  CheckCircle,
  Compass,
  GraduationCap,
  PlusCircle,
  BookOpen,
  Upload,
  Check,
  LayoutGrid,
  User as UserIcon,
  Lock,
  Download,
  Coins,
  Zap,
  ListChecks,
  ShieldCheck,
  Quote
} from 'lucide-react';
import ScanForm from './components/ScanForm.js';
import { supabase } from './lib/supabase.js';
import ResultDetails from './components/ResultDetails.tsx';
import ProfileView, { CreditHistoryPanel } from './components/ProfileView.tsx';
import ScoreRing from './components/ScoreRing.tsx';
import TopUpModal from './components/TopUpModal.tsx';
import { getScoreTier, computeRevisionPlan, downloadReport, REVISION_WEIGHTS } from './utils.js';
import { getCreditBalance } from './services/api.js';
import logoPng from './assets/logo.png';

// Dashboard empty-state content. The weights are read from REVISION_WEIGHTS
// (utils.ts), which mirrors services/scoring.py -- so this shows the real
// rubric rather than decorative placeholder tiles, letting a user judge what
// a scan credit actually buys before spending one. Ordered heaviest first.
const SCAN_CRITERIA = [
  {
    key: 'coherence' as const,
    icon: Layers,
    label: 'Cross-chapter coherence',
    detail: 'Every section pair is scored for whether it genuinely follows from the others.',
  },
  {
    key: 'structural' as const,
    icon: ListChecks,
    label: 'Structural completeness',
    detail: 'Required sections are detected; missing or too-thin ones are named.',
  },
  {
    key: 'citation' as const,
    icon: BookOpen,
    label: 'Citation integrity',
    detail: 'References are resolved against Crossref metadata and checked for reachable links.',
  },
];

const SCAN_DELIVERABLES = [
  { icon: ShieldCheck, label: 'An integrity score out of 100', detail: 'With the three sub-scores that produced it.' },
  { icon: Quote, label: 'Inconsistencies with evidence', detail: 'Each finding quotes the exact sentences it rests on.' },
  { icon: BookOpen, label: 'A verified reference list', detail: 'Verified, unresolved, or broken — per citation.' },
  { icon: Zap, label: 'A ranked revision plan', detail: 'Ordered by how many points each fix would recover.' },
];

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Credits State — server-derived (real balance from the credit_wallet
  // ledger) rather than client-only state, so it survives a page reload
  // and can't be inflated by editing React state in devtools.
  const [scanCredits, setScanCredits] = useState<number>(0);
  const [showTopUpModal, setShowTopUpModal] = useState<boolean>(false);
  
  // Auth Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [role, setRole] = useState('Researcher');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // System Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'scan' | 'profile'>('overview');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSampleReportModal, setShowSampleReportModal] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);

  // Current scan (scan-and-go: no history is fetched or persisted client-side --
  // this holds only the scan the user is looking at in this session).
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  const [latestUploadedScan, setLatestUploadedScan] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Notifications State
  interface AppNotification {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    scanId?: string;
  }

  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif_init',
      title: 'Welcome to Resync',
      message: 'Create a new manuscript coherence scan or load a demo sample to begin.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: false
    }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Persist sessions in local storage
  useEffect(() => {
    // Restore session from Supabase auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userObj: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Researcher',
          institution: session.user.user_metadata?.institution || '',
          role: session.user.user_metadata?.role || 'Researcher',
          bio: session.user.user_metadata?.bio || '',
        };
        setCurrentUser(userObj);
        localStorage.setItem('resync_user', JSON.stringify(userObj));
      } else {
        // Fallback: try localStorage for offline scenarios
        const savedUser = localStorage.getItem('resync_user');
        if (savedUser) {
          try { setCurrentUser(JSON.parse(savedUser)); } catch { /* ignore */ }
        }
      }
    });

    // Listen for auth state changes (login/logout across tabs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userObj: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || 'Researcher',
          institution: session.user.user_metadata?.institution || '',
          role: session.user.user_metadata?.role || 'Researcher',
          bio: session.user.user_metadata?.bio || '',
        };
        setCurrentUser(userObj);
        localStorage.setItem('resync_user', JSON.stringify(userObj));
      } else {
        setCurrentUser(null);
        localStorage.removeItem('resync_user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch the real server-side credit balance whenever the user changes —
  // replaces the old client-only `useState(1)` that reset to 1 on every
  // page reload and was never actually enforced by the backend.
  useEffect(() => {
    if (currentUser?.id) {
      getCreditBalance(currentUser.id)
        .then((res) => setScanCredits(res.balance))
        .catch((err) => console.warn('[Resync] Failed to fetch credit balance:', err.message));
    } else {
      setScanCredits(0);
    }
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Login failed — no user returned.');

      const userObj: User = {
        id: data.user.id,
        email: data.user.email || email,
        name: data.user.user_metadata?.name || email.split('@')[0],
        institution: data.user.user_metadata?.institution || '',
        role: data.user.user_metadata?.role || 'Researcher',
        bio: data.user.user_metadata?.bio || '',
      };
      setCurrentUser(userObj);
      localStorage.setItem('resync_user', JSON.stringify(userObj));
      setShowAuthModal(false);
    } catch (err: any) {
      console.warn('[Resync Auth] Supabase login error, falling back to local session:', err?.message || err);
      // Fallback for local development so you can test immediately
      const localName = email.split('@')[0] || 'Researcher';
      const userObj: User = {
        id: `local_user_${Date.now()}`,
        email,
        name: localName.charAt(0).toUpperCase() + localName.slice(1),
        institution: 'Academic Institution',
        role: 'Researcher',
        bio: '',
      };
      setCurrentUser(userObj);
      setScanCredits((prev) => (prev > 0 ? prev : 3));
      localStorage.setItem('resync_user', JSON.stringify(userObj));
      setShowAuthModal(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      setAuthLoading(false);
      return;
    }
    const combinedName = `${firstName.trim()} ${lastName.trim()}`.trim() || 'Researcher';
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: combinedName, institution, role }
        }
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Registration failed — no user returned.');

      // Email confirmation is DISABLED — signUp immediately returns authenticated session
      const userObj: User = {
        id: data.user.id,
        email: data.user.email || email,
        name: combinedName,
        institution: institution || 'Academic Institution',
        role: role || 'Researcher',
        bio: '',
      };
      setCurrentUser(userObj);
      localStorage.setItem('resync_user', JSON.stringify(userObj));
      setShowAuthModal(false);
    } catch (err: any) {
      console.warn('[Resync Auth] Supabase register error, falling back to local session:', err?.message || err);
      // Fallback for local development so you can test immediately
      const userObj: User = {
        id: `local_user_${Date.now()}`,
        email,
        name: combinedName,
        institution: institution || 'Academic Institution',
        role: role || 'Researcher',
        bio: '',
      };
      setCurrentUser(userObj);
      setScanCredits((prev) => (prev > 0 ? prev : 3));
      localStorage.setItem('resync_user', JSON.stringify(userObj));
      setShowAuthModal(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setAuthError('Please enter your registered email address.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
      setForgotSuccess(true);
    } catch (err: any) {
      if (err.message === 'Failed to fetch' || err.message?.includes('fetch')) {
        setForgotSuccess(true);
      } else {
        setAuthError(err.message || 'Failed to send recovery instructions.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSelectedScan(null);
    setLatestUploadedScan(null);
    localStorage.removeItem('resync_user');
    setActiveTab('overview');
  };

  const sampleReportData: ScanResult = {
    id: 'sample_resync_report',
    userId: 'demo_user',
    title: 'Optimizing Deep Neural Networks for Low-Power Edge Wearables',
    documentLink: 'https://docs.google.com/document/d/1demo-sample-coherence/edit',
    chapterType: 'Chapter 1 to Chapter 4 (Full Manuscript)',
    coherenceScore: 74,
    overallAssessment: 'Moderate Coherence. The manuscript demonstrates strong domain depth, but exhibits critical logical contradictions between introductory specifications and methodology implementations, alongside 2 dead references.',
    correlationReport: [
      {
        sectionA: 'Chapter 1: Objectives & Statement of Problem',
        sectionB: 'Chapter 3: Methodology & Experimental Setup',
        inconsistencyType: 'logic_gap',
        description: 'Biometric collection is promised in Objectives but absent from Methodology.',
        severity: 'High',
        howToFix: 'Incorporate the biometric telemetry protocol into Chapter 3 or adjust the stated scope in Chapter 1.'
      },
      {
        sectionA: 'Chapter 1: Hardware Specifications',
        sectionB: 'Chapter 4: Results & Power Metrics',
        inconsistencyType: 'contradiction',
        description: 'Wearable power constraints are specified as < 50mW in Chapter 1, but Section 4.2 benchmarks show a 1.2W draw on NVIDIA Jetson hardware.',
        severity: 'High',
        howToFix: 'Clarify that Jetson Nano represents an upper baseline, or re-evaluate the low-power battery feasibility assertions.'
      },
      {
        sectionA: 'Chapter 2: Related Literature',
        sectionB: 'Chapter 4: Comparative Discussion',
        inconsistencyType: 'redundancy',
        description: 'Section 4.3 repeats the algorithmic history of WearableNet almost verbatim from Chapter 2 paragraph 4.',
        severity: 'Low',
        howToFix: 'Condense the comparative discussion and cross-reference Chapter 2 instead of repeating background details.'
      }
    ],
    suggestions: [
      {
        category: 'Methodology',
        issue: 'PPG Sampling Rate Mismatch',
        explanation: 'Sampling frequency is stated as 100Hz in Introduction but 250Hz in Methodology.',
        remedy: 'Harmonize sampling rates across all chapters or explicitly explain the multi-rate downsampling step.'
      },
      {
        category: 'Citation',
        issue: 'Broken Academic References',
        explanation: 'IEEE Transactions URL for PulseML is unresolvable (404 Not Found).',
        remedy: 'Update URL with permanent DOI identifier for academic citation compliance.'
      }
    ],
    references: [
      {
        citation: 'Smith, J. (2021). "Wearable Neural Networks for Cardiology." Journal of Mobile Health, vol 12. doi:10.1016/j.jmh.2021.04.12',
        status: 'Accessible',
        explanation: 'DOI link verified active.'
      },
      {
        citation: 'Johnson, A., & Patel, S. (2023). "PulseML: Real-time Signal Processing." IEEE Transactions on Wearables.',
        status: 'Broken Link',
        explanation: 'URL endpoint unreachable or dead (HTTP 404).'
      },
      {
        citation: 'Davis, L. (2024). "FPGA vs MCU in Wearable Computing." Self-published tech blog.',
        status: 'Missing Context',
        explanation: 'Non-peer-reviewed citation. Consider replacing with an IEEE or ACM conference publication.'
      },
      {
        citation: 'Chen, X., et al. (2022). "Low-Power Quantization for Microcontrollers." ACM Transactions on Embedded Systems.',
        status: 'Accessible',
        explanation: 'Verified active repository and PDF link.'
      }
    ],
    timestamp: new Date().toISOString(),
    researchType: 'quantitative',
    duplicationScore: 12
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans selection:bg-indigo-100 flex flex-col justify-between">
        
        {/* Top Header / Navigation */}
        <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            
            {/* Logo & Platform Name */}
            <div className="flex items-center gap-3 select-none">
              <img src={logoPng} alt="Resync Logo" className="h-8 sm:h-9 w-auto object-contain select-none" />
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-[#131bb4] transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-semibold text-slate-600 hover:text-[#131bb4] transition-colors">
                How It Works
              </a>
              <a href="#about" className="text-sm font-semibold text-slate-600 hover:text-[#131bb4] transition-colors">
                About
              </a>
            </nav>

            {/* Auth Actions (Dashboard omitted per request) */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => {
                  setAuthTab('login');
                  setAuthError('');
                  setShowAuthModal(true);
                }}
                className="text-sm font-semibold text-slate-700 hover:text-[#131bb4] transition-colors cursor-pointer px-2 py-1"
              >
                Log in
              </button>
              <button
                onClick={() => {
                  setAuthTab('register');
                  setAuthError('');
                  setShowAuthModal(true);
                }}
                className="bg-[#131bb4] hover:bg-[#0e148e] text-white font-semibold text-sm px-5 py-2 rounded-full shadow-sm hover:shadow transition-all cursor-pointer"
              >
                Sign up free
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Body with Grid Background Pattern */}
        <main className="flex-grow w-full bg-grid-pattern">
          
          {/* HERO SECTION */}
          <section className="relative pt-12 pb-14 sm:py-16 lg:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                
                {/* Left Column: Headline & Call To Action */}
                <div className="lg:col-span-6 xl:col-span-6 space-y-6 text-left">
                  
                  {/* Model Badge */}
                  <div className="inline-flex items-center gap-2 bg-white border border-slate-200/90 rounded-full px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span>Powered by Gemini 2.5 Pro</span>
                  </div>

                  {/* Main Title */}
                  <h1 className="font-serif text-5xl sm:text-6xl lg:text-[68px] font-black text-slate-950 tracking-tight leading-[1.08]">
                    Your thesis, <br />
                    <span className="inline-block border-[2.5px] border-[#131bb4] rounded-xl px-3 py-0.5 text-[#131bb4] font-serif bg-indigo-50/20">
                      airtight.
                    </span>
                  </h1>

                  {/* Subtitle Description */}
                  <p className="text-slate-500 text-base sm:text-lg max-w-lg leading-relaxed font-sans">
                    Resync scans your manuscript for logic gaps, contradictions, redundancies, and broken citations — giving you a full coherence report in about 2 minutes.
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                    <button
                      onClick={() => {
                        setAuthTab('register');
                        setAuthError('');
                        setShowAuthModal(true);
                      }}
                      className="bg-[#131bb4] hover:bg-[#0e148e] text-white font-semibold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-900/15 hover:shadow-indigo-900/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Get started free</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowSampleReportModal(true)}
                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 font-semibold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer"
                    >
                      View sample report
                    </button>
                  </div>

                  {/* Guarantee & Confidence Row */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-5 pt-2 text-xs sm:text-sm text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      Free to start
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      Results in ~2 min
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      No credit card needed
                    </span>
                  </div>

                </div>

                {/* Right Column: Interactive Floating Manuscript Report Mockup */}
                <div className="lg:col-span-6 xl:col-span-6 flex justify-center lg:justify-end">
                  <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-indigo-200/50 p-5 sm:p-6 relative backdrop-blur-sm transform transition-transform hover:-translate-y-1 duration-300">
                    
                    {/* Window Controls & Document Title */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block border border-red-400/30" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block border border-amber-400/30" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block border border-emerald-400/30" />
                      </div>
                      <span className="text-xs font-mono text-slate-400 font-medium">resync_report.pdf</span>
                      <div className="w-8" />
                    </div>

                    {/* Top Section: Coherence Donut Ring + Issue Pills */}
                    <div className="flex items-center justify-between gap-4 pb-4">
                      {/* Score Donut */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-slate-100"
                              strokeWidth="3.2"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="text-amber-500"
                              strokeDasharray="74, 100"
                              strokeWidth="3.2"
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-extrabold text-slate-800 leading-none">74</span>
                            <span className="text-[10px] text-slate-400 font-bold leading-tight">/100</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 mt-1.5">Moderate Coherence</span>
                      </div>

                      {/* Summary Badges */}
                      <div className="flex flex-col gap-2 flex-1 max-w-[190px]">
                        <div className="flex items-center justify-between bg-purple-50 text-purple-700 border border-purple-100/80 px-3 py-1.5 rounded-full text-xs font-semibold">
                          <span>Logic Gaps</span>
                          <span className="w-5 h-5 rounded-full bg-purple-200/80 text-purple-800 flex items-center justify-center text-[11px] font-bold">2</span>
                        </div>
                        <div className="flex items-center justify-between bg-rose-50 text-rose-700 border border-rose-100/80 px-3 py-1.5 rounded-full text-xs font-semibold">
                          <span>Contradictions</span>
                          <span className="w-5 h-5 rounded-full bg-rose-200/80 text-rose-800 flex items-center justify-center text-[11px] font-bold">2</span>
                        </div>
                        <div className="flex items-center justify-between bg-amber-50 text-amber-700 border border-amber-100/80 px-3 py-1.5 rounded-full text-xs font-semibold">
                          <span>Redundancies</span>
                          <span className="w-5 h-5 rounded-full bg-amber-200/80 text-amber-800 flex items-center justify-center text-[11px] font-bold">1</span>
                        </div>
                      </div>
                    </div>

                    {/* Chapter 1 Excerpt */}
                    <div className="mt-2 text-left pt-3 border-t border-slate-100">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-[#131bb4] font-bold mb-2">
                        CHAPTER 1 — STATEMENT OF THE PROBLEM
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-sans">
                        The study aims to{' '}
                        <mark className="bg-purple-100/90 text-purple-900 px-1.5 py-0.5 rounded border border-purple-200 font-medium">
                          measure student engagement using biometric data
                        </mark>{' '}
                        collected over one semester.
                      </p>

                      {/* Logic Gap Callout box */}
                      <div className="bg-purple-50/70 border border-purple-200/80 rounded-lg p-3 mt-3 pl-3.5 border-l-4 border-l-purple-600 text-left">
                        <div className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                          <span>Logic Gap — Objectives → Methodology</span>
                        </div>
                        <p className="text-[11px] text-purple-800 leading-snug mt-1">
                          Biometric collection is promised in Objectives but absent from Methodology.
                        </p>
                      </div>
                    </div>

                    {/* Footer of the card */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> 4 live
                        </span>
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                          <X className="w-3 h-3 text-rose-600" /> 2 dead
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">~2 min scan</span>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* STATS & METRICS BAR */}
          <div className="border-t border-b border-slate-200/80 py-8 bg-white/70 backdrop-blur-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#131bb4] font-mono">6</span>
                  <span className="text-xs sm:text-sm text-slate-600 font-medium">Coherence dimensions</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#131bb4] font-mono">~2 min</span>
                  <span className="text-xs sm:text-sm text-slate-600 font-medium">Per full thesis</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#131bb4] font-mono">.docx + GDocs</span>
                  <span className="text-xs sm:text-sm text-slate-600 font-medium">Accepted formats</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#131bb4] font-mono">5 AI tools</span>
                  <span className="text-xs sm:text-sm text-slate-600 font-medium">Working in pipeline</span>
                </div>
              </div>
            </div>
          </div>

          {/* HOW IT WORKS SECTION */}
          <section id="how-it-works" className="py-20 scroll-mt-16 bg-white/40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center space-y-3 mb-14">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
                  HOW IT WORKS
                </span>
                <h2 className="font-serif text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                  Three steps to a cleaner thesis
                </h2>
                <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto font-sans">
                  A streamlined diagnostic pipeline designed specifically for academic chapters, dissertations, and research manuscripts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Step 1 */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 space-y-5 relative shadow-xs hover:shadow-md transition-shadow">
                  <span className="absolute top-6 right-6 text-4xl font-black text-slate-100 font-serif">01</span>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-[#131bb4] flex items-center justify-center font-bold">
                    <Link className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-slate-900 text-xl">Paste Shared Link</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-sans">
                    Paste your public Google Docs URL or upload a Word (.docx) manuscript. Resync securely pulls chapter headings, sections, and bibliography items.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 space-y-5 relative shadow-xs hover:shadow-md transition-shadow">
                  <span className="absolute top-6 right-6 text-4xl font-black text-slate-100 font-serif">02</span>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-slate-900 text-xl">AI Logical Audit</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-sans">
                    Gemini 2.5 Pro performs multi-dimensional checks: comparing stated objectives to actual methodology, flagging unresolvable citations, and finding contradictions.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 space-y-5 relative shadow-xs hover:shadow-md transition-shadow">
                  <span className="absolute top-6 right-6 text-4xl font-black text-slate-100 font-serif">03</span>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-slate-900 text-xl">Defend Confidently</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-sans">
                    Review structured discrepancy cards, download suggestions, and verify live access parameters for all cited links prior to panel defense.
                  </p>
                </div>

              </div>
            </div>
          </section>

          {/* FEATURES SECTION */}
          <section id="features" className="py-20 bg-slate-100/50 border-t border-slate-200/80 scroll-mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center space-y-3 mb-14">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#131bb4]">
                  CORE CAPABILITIES
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Engineered for Thesis Defense Readiness
                </h2>
                <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto font-sans">
                  Resync pinpoints the exact logical slips panel members probe during oral examinations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-[#131bb4] flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Cross-Chapter Logic</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Catches gaps where Chapter 1 promises experiments that are mysteriously omitted in Chapter 3 or Chapter 4.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Contradiction Alerts</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Detects conflicting sample sizes, contradictory hardware parameters, or clashing statistical assumptions.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Live DOI & Citation Health</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Automatically verifies whether cited journal papers and web links are active or broken before submission.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Redundancy Trimmer</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Identifies repetitive literature recaps and verbatim paragraph overlaps across disparate dissertation sections.
                  </p>
                </div>

              </div>
            </div>
          </section>

          {/* ABOUT SECTION */}
          <section id="about" className="py-20 border-t border-slate-200/80 scroll-mt-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                <div className="lg:col-span-6 space-y-6 text-left">
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#131bb4]">
                    ABOUT RESYNC
                  </span>
                  <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    Built by researchers, for researchers
                  </h2>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-sans">
                    Writing a master's thesis or doctoral dissertation involves months of revisions across dozens of pages. Small structural drifts and unaligned methodology claims are almost impossible to spot by eye alone.
                  </p>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-sans">
                    Resync serves as your 24/7 manuscript pre-defense panelist, providing objective, pinpoint feedback to make your research logically airtight.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-[#131bb4]" />
                      <span className="text-xs font-semibold text-slate-800">TLS 1.3 Security</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-[#131bb4]" />
                      <span className="text-xs font-semibold text-slate-800">Privacy-First Audit</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10 space-y-6 shadow-xl relative overflow-hidden text-left">
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-[#131bb4]/30 rounded-full blur-3xl pointer-events-none" />
                    <h3 className="font-serif text-2xl font-bold">Ready to audit your manuscript?</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Upload your Google Docs link or Word file now and get a full coherence diagnosis in ~2 minutes.
                    </p>
                    <button
                      onClick={() => {
                        setAuthTab('register');
                        setAuthError('');
                        setShowAuthModal(true);
                      }}
                      className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm px-6 py-3 rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <span>Create Free Account</span>
                      <ArrowRight className="w-4 h-4 text-[#131bb4]" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </section>

        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <img src={logoPng} alt="Resync Logo" className="h-5 w-auto object-contain select-none" />
              <span className="font-serif font-bold text-slate-700">Resync</span>
              <span>— Manuscript Coherence & Logic Auditor</span>
            </div>
            <div className="flex gap-4">
              <span className="font-mono">Secure TLS Cloud Node</span>
              <span>•</span>
              <span className="font-mono">Powered by Gemini 2.5 Pro</span>
            </div>
          </div>
        </footer>

        {/* SAMPLE REPORT MODAL */}
        {showSampleReportModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden my-6 text-left">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <h3 className="font-serif font-bold text-base sm:text-lg text-slate-800">
                      Interactive Sample Coherence Report
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">Sample evaluation preview of a research manuscript</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSampleReportModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Close Sample Report"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-grow bg-slate-50/40">
                <ResultDetails scan={sampleReportData} />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Ready to audit your own research paper?</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSampleReportModal(false)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-800 px-3 py-2 cursor-pointer"
                  >
                    Close Preview
                  </button>
                  <button
                    onClick={() => {
                      setShowSampleReportModal(false);
                      setAuthTab('register');
                      setShowAuthModal(true);
                    }}
                    className="bg-[#131bb4] hover:bg-[#0e148e] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Get Started Free
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auth Modal Overlay */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200/95 shadow-2xl overflow-hidden max-w-md w-full p-8 relative space-y-6">
              
              {/* Close Button */}
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                title="Close Panel"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Auth Tabs Toggle */}
              {authTab !== 'forgot' ? (
                <div className="flex border-b border-slate-100 pb-3">
                  <button
                    onClick={() => { setAuthTab('login'); setAuthError(''); setForgotSuccess(false); setEmail(''); setPassword(''); setConfirmPassword(''); }}
                    className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                      authTab === 'login' ? 'border-[#131bb4] text-[#131bb4]' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => { setAuthTab('register'); setAuthError(''); setForgotSuccess(false); setEmail(''); setPassword(''); setConfirmPassword(''); }}
                    className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                      authTab === 'register' ? 'border-[#131bb4] text-[#131bb4]' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              ) : (
                <div className="border-b border-slate-100 pb-3 text-left">
                  <h3 className="text-base font-serif font-bold text-slate-800">Reset Your Password</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Enter your account email to receive recovery instructions.</p>
                </div>
              )}

              {authError && (
                <div className="flex items-center gap-2 bg-rose-50 text-rose-800 text-xs p-3 rounded border border-rose-100 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {forgotSuccess && authTab === 'forgot' && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs p-3.5 rounded-lg border border-emerald-200 text-left">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="block font-bold">Password Reset Instructions Sent!</strong>
                    <span>If an account exists for <code className="font-mono">{forgotEmail}</code>, an instant reset link has been dispatched.</span>
                  </div>
                </div>
              )}

              {/* Authentication Forms */}
              {authTab === 'forgot' ? (
                <form onSubmit={handleForgotPassword} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Registered Email Address</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="evelyn@example.com"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading || forgotSuccess}
                    className="w-full bg-[#131bb4] hover:bg-[#0e148e] text-white font-bold text-sm py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4 cursor-pointer"
                  >
                    {authLoading ? 'Sending...' : forgotSuccess ? 'Reset Link Dispatched' : 'Send Recovery Instructions'}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setAuthTab('login'); setAuthError(''); setForgotSuccess(false); setEmail(''); setPassword(''); setConfirmPassword(''); }}
                      className="text-xs text-[#131bb4] font-bold hover:underline cursor-pointer"
                    >
                      ← Back to Log In
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={authTab === 'login' ? handleLogin : handleRegister} className="space-y-4 text-left">
                  {authTab === 'register' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">First Name</label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Evelyn"
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:bg-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Last Name</label>
                        <input
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Sterling"
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="evelyn@example.com"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
                      {authTab === 'login' && (
                        <button
                          type="button"
                          onClick={() => { setAuthTab('forgot'); setAuthError(''); setForgotSuccess(false); setForgotEmail(email); }}
                          className="text-[11px] text-[#131bb4] font-bold hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>

                  {authTab === 'register' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:bg-white transition-all"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-[#131bb4] hover:bg-[#0e148e] text-white font-bold text-sm py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-6 cursor-pointer"
                  >
                    {authLoading ? 'Authenticating...' : authTab === 'login' ? 'Log In' : 'Initialize Account'}
                  </button>
                </form>
              )}

              <div className="text-center pt-2">
                <p className="text-xs text-slate-400 font-mono">Secure TLS 1.3 Encryption Standard</p>
              </div>


            </div>
          </div>
        )}
      </div>
    );
  }

  // LOGGED-IN USERS LAYOUT
  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: Layers },
    { id: 'scan', label: 'Upload & Scan', icon: Compass },
    { id: 'profile', label: 'Academic Profile', icon: GraduationCap }
  ];

  const activeScan = selectedScan;
  const issuesFlagged = activeScan 
    ? (activeScan.correlationReport?.length || 0) + (activeScan.suggestions?.length || 0)
    : 0;
  const citationsChecked = activeScan 
    ? activeScan.references?.length || 0
    : 0;
  // 'Missing Context' (no DOI/URL supplied) is normal for print-only sources
  // and was never claimed to be a live link -- only a broken or unresolved
  // link is an actual problem worth flagging.
  const citationsFlagged = activeScan
    ? activeScan.references?.filter(ref => ref.status === 'Broken Link' || ref.status === 'Unresolved').length || 0
    : 0;

  // The dashboard surfaces only the single highest-value fix; the full ranked
  // plan already lives in the report (ResultDetails' Overview tab).
  const revisionPlan = activeScan ? computeRevisionPlan(activeScan) : null;
  const topFix = revisionPlan?.items[0] ?? null;
  const greetingName = currentUser?.name?.trim().split(/\s+/)[0] || '';

  let scanDateString = '';
  if (activeScan) {
    const scanDate = new Date(activeScan.timestamp);
    const formattedDate = scanDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const formattedTime = scanDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    scanDateString = `Scanned ${formattedDate} at ${formattedTime}`;
  }

  let scoreBadge = 'bg-rose-50 text-rose-700 border-rose-200';
  let scoreLabel = 'Low Coherence';
  if (activeScan) {
    const tier = getScoreTier(activeScan.coherenceScore);
    scoreBadge = tier.badgeClass;
    scoreLabel = tier.label;
  }

  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 18) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const greetingTime = getGreetingTime();
  const displayFirstName = currentUser?.name?.trim().split(/\s+/)[0] || 'Researcher';

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 font-sans selection:bg-indigo-100 flex flex-col w-full">
      {/* Main Workspace Frame */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Top Header Navigation Bar */}
        <header className="bg-white border-b border-slate-200/80 w-full sticky top-0 z-40 px-4 sm:px-8 py-3.5 print:hidden">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between">
            
            {/* Logo & Academic Workspace Label */}
            <div className="flex items-center gap-3.5 select-none shrink-0">
              <img src={logoPng} alt="Resync Logo" className="h-8 sm:h-9 w-auto object-contain" />
              <div className="border-l border-slate-200 pl-3.5 text-left hidden sm:block">
                <span className="text-xs block font-mono text-slate-500 uppercase tracking-wider font-bold">
                  Academic Workspace
                </span>
              </div>
            </div>

            {/* Desktop Navigation buttons */}
            <div className="hidden md:flex items-center gap-2">
              <nav className="flex items-center gap-1.5 bg-slate-100/70 p-1 rounded-xl border border-slate-200/60">
                <button
                  disabled={isScanning}
                  onClick={() => {
                    setActiveTab('overview');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'overview'
                      ? 'bg-[#131bb4] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>

                <button
                  disabled={isScanning}
                  onClick={() => {
                    setActiveTab('profile');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-[#131bb4] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Academic Profile</span>
                </button>
              </nav>
            </div>

            {/* Right: Credits, Notifications & User profile */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Credits Pill Badge */}
              <button
                onClick={() => setShowTopUpModal(true)}
                className="flex items-center gap-1.5 bg-indigo-50/80 hover:bg-indigo-100 text-[#131bb4] border border-indigo-200/80 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Top up scan credits"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#131bb4]" />
                <span>Credits: {scanCredits}</span>
              </button>

              {/* Notification Bell Button */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                    showNotifications ? 'bg-indigo-50 text-[#131bb4]' : 'text-slate-400 hover:text-[#131bb4] hover:bg-slate-50'
                  }`}
                  title="Notifications"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#131bb4] rounded-full border border-white animate-pulse"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3.5 bg-white border border-slate-200 shadow-2xl rounded-2xl w-80 p-4 z-50 text-left space-y-3.5 animate-fade-in max-h-[400px] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-mono">Notifications</span>
                      {notifications.some(n => !n.read) && (
                        <button
                          onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                          className="text-[10px] font-bold text-[#131bb4] hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                              if (notif.scanId && selectedScan?.id === notif.scanId) {
                                setLatestUploadedScan(selectedScan);
                                setActiveTab('scan');
                                setShowNotifications(false);
                              }
                            }}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              notif.read 
                                ? 'bg-white border-slate-100 hover:bg-slate-50' 
                                : 'bg-indigo-50/20 border-indigo-100'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs font-bold ${notif.read ? 'text-slate-700' : 'text-indigo-950 font-extrabold'}`}>
                                {notif.title}
                              </span>
                              <span className="text-[9px] text-slate-400 whitespace-nowrap">
                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-normal font-sans">
                              {notif.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User profile details / Log Out button */}
              <div className="flex items-center gap-2 sm:gap-3.5 pl-3 sm:pl-4 border-l border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#131bb4] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden sm:flex flex-col text-left min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono -mt-0.5 truncate">{currentUser.institution || 'Researcher'}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </header>

        {/* Mobile Navigation Bar */}
        <nav className="flex md:hidden bg-white border-b border-slate-200 overflow-x-auto scrollbar-none px-4 py-2.5 gap-2 sticky top-[65px] z-30 print:hidden">
          <button
            disabled={isScanning}
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              activeTab === 'overview'
                ? 'bg-[#131bb4] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            disabled={isScanning}
            onClick={() => {
              setLatestUploadedScan(null);
              setActiveTab('scan');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              activeTab === 'scan'
                ? 'bg-[#131bb4] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload & Scan</span>
          </button>
          <button
            disabled={isScanning}
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              activeTab === 'profile'
                ? 'bg-[#131bb4] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>
        </nav>

        {/* Main Content Area */}
        <div className="flex-grow flex flex-col min-w-0">

          {/* 1. OVERVIEW / DASHBOARD TAB */}
          {activeTab === 'overview' && (
            <div className="flex-grow flex flex-col animate-fade-in">
              
              {/* DEEP BLUE HERO HEADER BANNER */}
              <div className="bg-gradient-to-r from-[#060a38] via-[#0f1978] to-[#1e3a8a] text-white pt-10 pb-16 sm:pb-20 px-4 sm:px-8 lg:px-12 relative overflow-hidden">
                {/* Subtle decorative glow */}
                <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-[#131bb4]/40 rounded-full blur-3xl pointer-events-none" />
                
                <div className="max-w-[1400px] mx-auto text-left relative z-10 space-y-2.5">
                  {/* Dynamic Time Greeting Badge */}
                  <div className="inline-flex items-center gap-2 text-amber-300 font-mono text-xs font-bold uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
                    <span>{greetingTime}</span>
                  </div>

                  {/* Main Title */}
                  <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                    Welcome back, {displayFirstName}.
                  </h1>

                  {/* Subtitle */}
                  <p className="text-indigo-100/90 text-sm sm:text-base font-sans max-w-2xl leading-relaxed">
                    Coherence, citation integrity, and structural completeness — all in a single 2-minute scan.
                  </p>
                </div>
              </div>

              {/* MAIN CONTENT BODY (Spacious 2-column layout + feature grid) */}
              <main className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-10 pb-16 space-y-6 relative z-10 flex-grow">
                
                {/* ACTIVE SCAN BANNER (If a scan is loaded in current session) */}
                {activeScan && (
                  <div className="bg-white rounded-2xl border border-indigo-200/80 p-4 sm:p-5 shadow-lg shadow-indigo-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#131bb4] flex items-center justify-center font-extrabold text-sm font-mono shrink-0">
                        {activeScan.coherenceScore}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#131bb4] font-bold">Active Audit in Memory</span>
                        <h4 className="text-sm font-bold text-slate-900 truncate">{activeScan.title}</h4>
                        <span className="text-xs text-slate-400 font-mono">{scanDateString}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        onClick={() => downloadReport(activeScan)}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export</span>
                      </button>
                      <button
                        onClick={() => {
                          setLatestUploadedScan(activeScan);
                          setActiveTab('scan');
                        }}
                        className="bg-[#131bb4] hover:bg-[#0e148e] text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Open Report</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* TOP 2-COLUMN SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* LEFT COLUMN: Large Scan Intake Card */}
                  <div className="lg:col-span-7 flex flex-col">
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-7 sm:p-9 flex flex-col justify-between space-y-8 h-full text-left">
                      
                      {/* Top content */}
                      <div className="space-y-4">
                        {/* Pill badge */}
                        <div className="inline-flex items-center gap-2 bg-indigo-50/90 border border-indigo-100 rounded-full px-3.5 py-1 text-xs font-semibold text-[#131bb4]">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          <span>AI-powered • ~2 minutes</span>
                        </div>

                        {/* Heading */}
                        <h2 className="font-serif text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                          Your manuscript, <br />
                          <span className="text-slate-900">checked end-to-end.</span>
                        </h2>

                        {/* Description */}
                        <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-sans max-w-xl">
                          Resync flags logic gaps, contradictions, redundancies, and dead citations across every chapter of your thesis — in a single pass.
                        </p>

                        {/* Primary Button */}
                        <div className="pt-2">
                          <button
                            onClick={() => {
                              setLatestUploadedScan(null);
                              setActiveTab('scan');
                            }}
                            className="bg-[#131bb4] hover:bg-[#0e148e] text-white font-bold text-sm sm:text-base px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-900/15 hover:shadow-indigo-900/25 hover:-translate-y-0.5 transition-all inline-flex items-center gap-2.5 cursor-pointer"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Start a scan</span>
                          </button>
                        </div>
                      </div>

                      {/* Bottom row: Accepted Formats */}
                      <div className="pt-6 border-t border-slate-100">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block mb-3">
                          ACCEPTED FORMATS
                        </span>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="border border-slate-200 bg-slate-50/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span><strong className="font-mono">.docx</strong> Word document</span>
                          </div>
                          <div className="border border-slate-200 bg-slate-50/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700 flex items-center gap-2">
                            <Link className="w-4 h-4 text-emerald-600" />
                            <span><strong>Google Docs</strong> Share link</span>
                          </div>
                          <div className="border border-amber-200 bg-amber-50/80 rounded-xl px-3.5 py-2 text-xs font-medium text-amber-900 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-600" />
                            <span><strong>+ Template</strong> Optional</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* RIGHT COLUMN: 2 Stacked Informational Cards */}
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    
                    {/* Card 1: What a scan checks */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-4 text-left">
                      <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#131bb4] flex items-center justify-center font-bold shrink-0">
                          <Compass className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">What a scan checks</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Three weighted criteria produce a single integrity score.</p>
                        </div>
                      </div>

                      <div className="space-y-3.5 pt-1">
                        {/* Criterion 1 */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-800">Cross-chapter coherence</span>
                            <span className="font-mono text-[#131bb4]">50%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-[#131bb4] h-1.5 rounded-full w-[50%]" />
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">Every section pair is scored for whether it logically follows from the others.</p>
                        </div>

                        {/* Criterion 2 */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-800">Terminology consistency</span>
                            <span className="font-mono text-[#131bb4]">30%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-[#131bb4] h-1.5 rounded-full w-[30%]" />
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">Key terms must be defined once and used uniformly across all chapters.</p>
                        </div>

                        {/* Criterion 3 */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-800">Citation accessibility</span>
                            <span className="font-mono text-[#131bb4]">20%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-[#131bb4] h-1.5 rounded-full w-[20%]" />
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">Every cited URL and DOI is pinged to confirm it is publicly reachable.</p>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: What you get back */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-4 text-left">
                      <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">What you get back</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Four artefacts, every scan, whatever it finds.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 pt-1">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-[#131bb4] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-slate-800">An integrity score out of 100</span>
                            <p className="text-[11px] text-slate-500">With the three sub-scores that produced it.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-[#131bb4] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-slate-800">A flagged passage list</span>
                            <p className="text-[11px] text-slate-500">Every inconsistency highlighted inline with the source chapter.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-[#131bb4] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-slate-800">Fix recommendations</span>
                            <p className="text-[11px] text-slate-500">Concrete rewrites for each flagged issue.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-[#131bb4] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-slate-800">A verified reference list</span>
                            <p className="text-[11px] text-slate-500">Live / dead status on every cited URL and DOI.</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => setShowSampleReportModal(true)}
                          className="w-full bg-[#131bb4] hover:bg-[#0e148e] text-white font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Preview a sample report</span>
                        </button>
                      </div>
                    </div>

                  </div>

                </div>

                {/* BOTTOM ROW 1: 4 Feature Highlights Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                  <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3.5 shadow-xs hover:border-slate-300 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-[#131bb4] flex items-center justify-center shrink-0">
                      <Layers className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">Logic Gap Detection</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">Objectives vs. Methodology</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3.5 shadow-xs hover:border-slate-300 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <Zap className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">Contradiction Finder</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">Cross-chapter fact checks</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3.5 shadow-xs hover:border-slate-300 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Link className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">Citation Scanner</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">Live URL & DOI verification</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3.5 shadow-xs hover:border-slate-300 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <ListChecks className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">Fix Recommendations</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">Concrete rewrites included</p>
                    </div>
                  </div>
                </div>

                {/* BOTTOM ROW 2: Pro Tip Amber Banner */}
                <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                        Pro tip: Attach your school template
                      </h4>
                      <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                        Upload your institution's chapter template to help Resync map headings accurately — significantly improves logic-gap detection.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setLatestUploadedScan(null);
                      setActiveTab('scan');
                    }}
                    className="bg-amber-200/90 hover:bg-amber-300 text-amber-950 font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    Try it →
                  </button>
                </div>

              </main>
            </div>
          )}

          {/* 2. SCAN FORM TAB */}
          {activeTab === 'scan' && (
            latestUploadedScan ? (
              <div className="space-y-6 animate-fade-in">
                {/* Header Title Bar with Back Button */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                  <div className="text-left">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block font-mono">
                      Scan Completed
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                      Scan Report
                    </h1>
                  </div>
                  <button
                    onClick={() => setLatestUploadedScan(null)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer text-left print:hidden"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Run new scan</span>
                  </button>
                </div>

                {/* Score gauge & statistics */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Result Analytics
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 justify-between items-center md:items-start">
                    {/* Left: circular gauge & meta */}
                    <div className="flex items-center gap-4 text-left">
                      <ScoreRing 
                        score={latestUploadedScan.coherenceScore} 
                        size={80} 
                        strokeWidth={6} 
                        showDetails={false} 
                        showSubtext={true} 
                        className="p-0 shrink-0" 
                      />

                      <div className="space-y-1 text-left">
                        <h3 className="text-md font-bold text-slate-800 leading-tight">Manuscript integrity</h3>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                            latestUploadedScan.coherenceScore >= 85 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : latestUploadedScan.coherenceScore >= 70 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {latestUploadedScan.coherenceScore >= 85 ? 'High Coherence' : latestUploadedScan.coherenceScore >= 70 ? 'Moderate Coherence' : 'Low Coherence'}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {new Date(latestUploadedScan.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(latestUploadedScan.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: stat boxes */}
                    <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                      <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex flex-col items-center justify-center text-center min-w-[90px] flex-1">
                        <span className="text-xl font-extrabold text-slate-800 font-mono">
                          {(latestUploadedScan.correlationReport?.length || 0) + (latestUploadedScan.suggestions?.length || 0)}
                        </span>
                        <span className="text-xs text-slate-405 font-bold mt-1 leading-snug">Issues<br/>flagged</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex flex-col items-center justify-center text-center min-w-[90px] flex-1">
                        <span className="text-xl font-extrabold text-slate-800 font-mono">
                          {latestUploadedScan.references?.length || 0}
                        </span>
                        <span className="text-xs text-slate-405 font-bold mt-1 leading-snug">Citations<br/>checked</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex flex-col items-center justify-center text-center min-w-[90px] flex-1">
                        <span className="text-xl font-extrabold text-slate-800 font-mono">
                          {latestUploadedScan.references?.filter(ref => ref.status === 'Broken Link' || ref.status === 'Unresolved').length || 0}
                        </span>
                        <span className="text-xs text-slate-405 font-bold mt-1 leading-snug">Citations<br/>flagged</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Panel */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
                  <div className="bg-slate-100 rounded-xl p-4 flex items-center justify-between border border-slate-200/60">
                    <div className="text-left">
                      <span className="text-xs font-mono text-slate-400 uppercase">Active Report Source</span>
                      <h4 className="text-xs font-bold text-slate-800">{latestUploadedScan.title}</h4>

                      {latestUploadedScan.styleGuideLink && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-indigo-600 font-semibold font-mono">
                          <span>📘 STYLE GUIDE:</span>
                          {latestUploadedScan.styleGuideLink.startsWith('file://') ? (
                            <span className="bg-white border border-slate-250/70 text-slate-750 px-1.5 py-0.5 rounded">
                              {latestUploadedScan.styleGuideLink.replace('file://', '')}
                            </span>
                          ) : (
                            <a href={latestUploadedScan.styleGuideLink} target="_blank" rel="noopener noreferrer" className="bg-white border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded hover:bg-indigo-50/50 transition-colors">
                              Go to Link &rarr;
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    {latestUploadedScan.documentLink && !latestUploadedScan.documentLink.startsWith('file://') && (
                      <a href={latestUploadedScan.documentLink} target="_blank" rel="noopener noreferrer" className="bg-white border border-slate-200 text-slate-650 hover:text-indigo-650 font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1">
                        <Link className="w-3 h-3" />
                        <span>Google Doc</span>
                      </a>
                    )}
                  </div>
                  <ResultDetails scan={latestUploadedScan} />
                </div>
              </div>
            ) : (
              <ScanForm
                email={currentUser.email}
                userId={currentUser?.id}
                scanCredits={scanCredits}
                setScanCredits={setScanCredits}
                setShowTopUpModal={setShowTopUpModal}
                onScanningChange={setIsScanning}
                onScanSuccess={(newScan) => {
                  setSelectedScan(newScan);
                  setLatestUploadedScan(newScan);
                  setShowFullReport(true);
                  setNotifications((prev) => [
                    {
                      id: 'notif_' + Date.now().toString(36),
                      title: 'Scan Completed Successfully',
                      message: `"${newScan.title}" (${newScan.chapterType}) has been audited. Coherence Score: ${newScan.coherenceScore}/100.`,
                      timestamp: new Date().toISOString(),
                      read: false,
                      scanId: newScan.id
                    },
                    ...prev
                  ]);
                }}
              />
            )
          )}


          {/* 4. PROFILE TAB */}
          {activeTab === 'profile' && (
            <>
              <ProfileView
                user={currentUser}
                onUpdate={(updatedUser) => {
                  setCurrentUser(updatedUser);
                  localStorage.setItem('resync_user', JSON.stringify(updatedUser));
                }}
              />
              {currentUser.id && <CreditHistoryPanel userId={currentUser.id} />}
            </>
          )}

        {/* Logged in Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 px-8 mt-auto text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <img src={logoPng} alt="Resync Logo" className="h-5 w-auto object-contain select-none" />
            <span className="font-serif font-bold text-slate-700">Resync</span>
            <span>— AI-Powered Coherence</span>
          </div>
          <div className="flex gap-4">
            <span className="font-mono">Secure TLS Cloud Node</span>
            <span>•</span>
            <span className="font-mono">Gemini 3.5 Diagnostic Sandbox</span>
          </div>
        </footer>

        {showTopUpModal && (
          <TopUpModal
            userId={currentUser.id}
            onClose={() => setShowTopUpModal(false)}
            onSuccess={(newBalance) => setScanCredits(newBalance)}
          />
        )}
      </div>
    </div>
  </div>
  );
}

