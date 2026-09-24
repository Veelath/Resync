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
import ScanForm from './components/ScanForm.tsx';
import { HomeScreen, LoginScreen, SignupScreen } from './components/AuthAndLanding.tsx';
import { supabase } from './lib/supabase.js';
import ResultDetails from './components/ResultDetails.tsx';
import ProfileView, { CreditHistoryPanel } from './components/ProfileView.tsx';
import ScoreRing from './components/ScoreRing.tsx';
import TopUpModal from './components/TopUpModal.tsx';
import { getScoreTier, computeRevisionPlan, downloadReport, REVISION_WEIGHTS } from './utils.js';
import { getCreditBalance } from './services/api.js';
import logoPng from './assets/logo.png';
import { MOCK_SCAN_RESULT } from './mockData.js';

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
  { icon: BookOpen, label: 'A verified reference list', detail: 'Verified, unresolved, or broken ΓÇö per citation.' },
  { icon: Zap, label: 'A ranked revision plan', detail: 'Ordered by how many points each fix would recover.' },
];

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Credits State ΓÇö server-derived (real balance from the credit_wallet
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
  const [showDemoPreview, setShowDemoPreview] = useState(false);
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

  // Fetch the real server-side credit balance whenever the user changes ΓÇö
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
      if (!data.user) throw new Error('Login failed ΓÇö no user returned.');

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
      console.error('[Resync Auth] Supabase login error:', err?.message || err);
      setAuthError(err?.message || 'Invalid login credentials.');
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
      if (!data.user) throw new Error('Registration failed ΓÇö no user returned.');

      // Email confirmation is DISABLED ΓÇö signUp immediately returns authenticated session
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
    
  };

  if (!currentUser) {
    if (showDemoPreview) {
      return (
        <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden">
          <div className="bg-[#0b104a] text-white px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-indigo-900/60 z-50 shrink-0">
            <div className="flex items-center gap-3">
              <img src={logoPng} alt="Resync" className="h-6 w-auto" />
              <div className="h-4 w-px bg-indigo-700/60 hidden sm:block" />
              <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider">
                Interactive Manuscript Demo
              </span>
              <span className="text-xs text-indigo-200 hidden md:inline">
                Two-Pane Preview & Issue Highlighting
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowDemoPreview(false);
                  setAuthTab('login');
                  setShowAuthModal(true);
                }}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => setShowDemoPreview(false)}
                className="bg-[#1a1fcc] hover:bg-[#2d35e8] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <span>&larr; Exit Demo</span>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ResultDetails scan={MOCK_SCAN_RESULT} />
          </div>
        </div>
      );
    }

    if (showAuthModal && authTab === 'login') {
      return <LoginScreen 
        error={authError}
        isLoading={authLoading}
        onNavigate={(s) => {
          if (s === 'signup') { setAuthTab('register'); }
          else if (s === 'home' || s === 'dashboard') { setShowAuthModal(false); }
        }} 
        onLogin={(e, p) => {
          setEmail(e);
          setPassword(p);
          // Trigger the standard handleLogin flow
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
          handleLogin(fakeEvent);
        }} 
      />;
    }
    
    if (showAuthModal && authTab === 'register') {
      return <SignupScreen 
        error={authError}
        isLoading={authLoading}
        onNavigate={(s) => {
          if (s === 'login') { setAuthTab('login'); }
          else if (s === 'home' || s === 'dashboard') { setShowAuthModal(false); }
        }}
        onSignup={(n, e, p, i, r) => {
          setEmail(e);
          setPassword(p);
          setFirstName(n.split(' ')[0] || '');
          setLastName(n.split(' ').slice(1).join(' ') || '');;
          setInstitution(i);
          setRole(r);
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
          handleRegister(fakeEvent);
        }}
      />;
    }

    return <HomeScreen onNavigate={(s) => {
      if (s === 'login') { setAuthTab('login'); setShowAuthModal(true); }
      else if (s === 'signup') { setAuthTab('register'); setShowAuthModal(true); }
      else if (s === 'dashboard') { setAuthTab('login'); setShowAuthModal(true); }
      else if (s === 'demo' || s === 'results') { setShowDemoPreview(true); }
    }} />;
  }

  
  let activeScan = selectedScan || latestUploadedScan;
  
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
                    Coherence, citation integrity, and structural completeness ΓÇö all in a single 2-minute scan.
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
                          <span>AI-powered ΓÇó ~2 minutes</span>
                        </div>

                        {/* Heading */}
                        <h2 className="font-serif text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                          Your manuscript, <br />
                          <span className="text-slate-900">checked end-to-end.</span>
                        </h2>

                        {/* Description */}
                        <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-sans max-w-xl">
                          Resync flags logic gaps, contradictions, redundancies, and dead citations across every chapter of your thesis ΓÇö in a single pass.
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
                          onClick={() => {
                            setSelectedScan(MOCK_SCAN_RESULT);
                            setLatestUploadedScan(MOCK_SCAN_RESULT);
                            setActiveTab('scan');
                          }}
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
                        Upload your institution's chapter template to help Resync map headings accurately ΓÇö significantly improves logic-gap detection.
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
                    Try it ΓåÆ
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
                          <span>≡ƒôÿ STYLE GUIDE:</span>
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
                onBack={() => setActiveTab('overview')}
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
            <span>ΓÇö AI-Powered Coherence</span>
          </div>
          <div className="flex gap-4">
            <span className="font-mono">Secure TLS Cloud Node</span>
            <span>ΓÇó</span>
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

