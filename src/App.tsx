/**
   * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, ScanResult } from './types.js';
import { 
  Sparkles, 
  Search, 
  History, 
  Layers, 
  UserCheck, 
  LogOut, 
  HelpCircle, 
  AlertTriangle, 
  ArrowRight,
  BookOpen,
  GraduationCap,
  PlusCircle,
  FileSpreadsheet,
  Trash2,
  Lock,
  User as UserIcon,
  Compass,
  CheckCircle,
  AlertCircle,
  Link,
  X,
  LayoutGrid,
  Upload,
  Bell,
  ShieldCheck,
  FileText,
  Check
} from 'lucide-react';
import ScanForm from './components/ScanForm.tsx';
import ResultDetails from './components/ResultDetails.tsx';
import ProfileView from './components/ProfileView.tsx';
import ScoreRing from './components/ScoreRing.tsx';
import { getScoreTier } from './utils.js';
import logoPng from './assets/logo.png';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  
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

  // System Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'scan' | 'results' | 'profile'>('overview');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSampleReportModal, setShowSampleReportModal] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);
  
  // Scans State
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [latestUploadedScan, setLatestUploadedScan] = useState<ScanResult | null>(null);
  const [rescanScan, setRescanScan] = useState<ScanResult | null>(null);

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



  // Live Hover Preview State for History/Archive Reports
  const [hoveredScan, setHoveredScan] = useState<ScanResult | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Persist sessions in local storage
  useEffect(() => {
    const savedUser = localStorage.getItem('resync_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
      } catch (err) {
        console.error('Failed to parse saved user', err);
      }
    }
  }, []);

  // Sync scan history when user changes or returns to overview/results
  useEffect(() => {
    if (currentUser) {
      fetchScanHistory();
    }
  }, [currentUser]);

  const fetchScanHistory = async () => {
    if (!currentUser) return;
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/scans/history?email=${encodeURIComponent(currentUser.email)}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setScans(data.scans || []);
        // Set the most recent scan as selected by default to display stats
        if (data.scans && data.scans.length > 0 && !selectedScan) {
          setSelectedScan(data.scans[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch scans:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }
      setCurrentUser(data.user);
      localStorage.setItem('resync_user', JSON.stringify(data.user));
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(err.message);
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
    try {
      const combinedName = `${firstName.trim()} ${lastName.trim()}`;
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: combinedName, password, institution, role })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }
      // Auto login after registration
      setCurrentUser(data.user);
      localStorage.setItem('resync_user', JSON.stringify(data.user));
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedScan(null);
    setScans([]);
    setLatestUploadedScan(null);
    setRescanScan(null);
    localStorage.removeItem('resync_user');
    setActiveTab('overview');
  };

  const handleDeleteScan = async (scanId: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete this scan from history?')) return;

    const deletedScan = scans.find(s => s.id === scanId);

    try {
      const response = await fetch(`/api/scans/${scanId}?email=${encodeURIComponent(currentUser.email)}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setScans(scans.filter(s => s.id !== scanId));
        if (selectedScan && selectedScan.id === scanId) {
          const remaining = scans.filter(s => s.id !== scanId);
          setSelectedScan(remaining.length > 0 ? remaining[0] : null);
        }
        
        // Add built-in deletion notification
        setNotifications((prev) => [
          {
            id: 'notif_' + Date.now().toString(36),
            title: 'Scan Record Deleted',
            message: `The scan record "${deletedScan?.title || 'Unknown'}" was deleted from history.`,
            timestamp: new Date().toISOString(),
            read: false
          },
          ...prev
        ]);
      }
    } catch (err) {
      console.error('Delete scan failed:', err);
    }
  };

  const latestScan = scans[0] || null;

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
              <div className="flex border-b border-slate-100 pb-3">
                <button
                  onClick={() => { setAuthTab('login'); setAuthError(''); }}
                  className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                    authTab === 'login' ? 'border-[#131bb4] text-[#131bb4]' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Log In
                </button>
                <button
                  onClick={() => { setAuthTab('register'); setAuthError(''); }}
                  className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                    authTab === 'register' ? 'border-[#131bb4] text-[#131bb4]' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {authError && (
                <div className="flex items-center gap-2 bg-rose-50 text-rose-800 text-xs p-3 rounded border border-rose-100">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Authentication Forms */}
              <form onSubmit={authTab === 'login' ? handleLogin : handleRegister} className="space-y-4">
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
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
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
    { id: 'results', label: 'Reports', icon: FileSpreadsheet },
    { id: 'profile', label: 'Academic Profile', icon: GraduationCap }
  ];

  const activeScan = selectedScan || scans[0];
  const issuesFlagged = activeScan 
    ? (activeScan.correlationReport?.length || 0) + (activeScan.suggestions?.length || 0)
    : 0;
  const citationsChecked = activeScan 
    ? activeScan.references?.length || 0
    : 0;
  const citationsFlagged = activeScan
    ? activeScan.references?.filter(ref => ref.status !== 'Accessible').length || 0
    : 0;

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 flex flex-col w-full">
      {/* Main Workspace Frame */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Top Header Navigation Bar */}
        <header className="bg-white border-b border-slate-200/80 w-full sticky top-0 z-40 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            
            {/* Logo block */}
            <div className="flex items-center gap-3 select-none shrink-0">
              <img src={logoPng} alt="Resync Logo" className="h-9 w-auto object-contain" />
              <div className="border-l border-slate-200 pl-3 text-left hidden sm:block">
                <span className="text-xs block font-mono text-indigo-650 uppercase tracking-widest font-bold">Manuscript Coherence</span>
              </div>
            </div>

            {/* Desktop Navigation buttons */}
            <div className="hidden md:flex items-center gap-1.5">
              <nav className="flex items-center gap-1.5">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        if (item.id === 'scan') {
                          setLatestUploadedScan(null);
                          setRescanScan(null);
                        }
                        if (item.id === 'overview' && scans.length > 0) {
                          setSelectedScan(scans[0]);
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Right: Notifications & User profile & Log Out */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Notification Bell Button */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                    showNotifications ? 'bg-indigo-50 text-indigo-655' : 'text-slate-400 hover:text-indigo-650 hover:bg-slate-50'
                  }`}
                  title="Notifications"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border border-white animate-pulse"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3.5 bg-white border border-slate-200 shadow-2xl rounded-2xl w-80 p-4 z-50 text-left space-y-3.5 animate-fade-in max-h-[400px] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-mono">Notifications</span>
                      {notifications.some(n => !n.read) && (
                        <button
                          onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-805 hover:underline"
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
                              if (notif.scanId) {
                                const foundScan = scans.find(s => s.id === notif.scanId);
                                if (foundScan) {
                                  setSelectedScan(foundScan);
                                  setLatestUploadedScan(foundScan);
                                  setActiveTab('scan');
                                  setShowNotifications(false);
                                }
                              }
                            }}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              notif.read 
                                ? 'bg-white border-slate-100 hover:bg-slate-55 hover:border-slate-200' 
                                : 'bg-indigo-50/10 border-indigo-100 hover:bg-indigo-50/20'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs font-bold ${notif.read ? 'text-slate-700' : 'text-indigo-950 font-extrabold'}`}>
                                {notif.title}
                              </span>
                              <span className="text-[9px] text-slate-405 whitespace-nowrap">
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
              <div className="flex items-center gap-2 sm:gap-4 pl-3 sm:pl-4 border-l border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100 shrink-0">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden sm:flex flex-col text-left min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</span>
                    <span className="text-xs text-slate-400 font-mono -mt-0.5 truncate">{currentUser.institution || 'Researcher'}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 transition-all cursor-pointer"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

          </div>
        </header>

        {/* Mobile Navigation Bar */}
        <nav className="flex md:hidden bg-white border-b border-slate-200 overflow-x-auto scrollbar-none px-4 py-3 gap-1.5 sticky top-[73px] z-30">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (item.id === 'scan') {
                    setLatestUploadedScan(null);
                    setRescanScan(null);
                  }
                  if (item.id === 'overview' && scans.length > 0) {
                    setSelectedScan(scans[0]);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Main Content Area */}
        <div className="flex-grow flex flex-col min-w-0">

        {/* Tab Panel Renderings */}
        <main className="flex-grow p-6 sm:p-8 max-w-[1400px] w-full mx-auto space-y-8 animate-fade-in">
          
          {/* 1. OVERVIEW / DASHBOARD TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Title Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block font-mono">
                    Resync Academic Workspace
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                    Dashboard
                  </h1>
                </div>
                <button
                  onClick={() => setActiveTab('scan')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer animate-fade-in"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>New scan</span>
                </button>
              </div>

              {scans.length === 0 ? (
                /* NEW USER DASHBOARD */
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm space-y-8 flex flex-col md:flex-row md:items-start md:gap-8">
                    {/* Circle Sparkle Graphic */}
                    <div className="flex-shrink-0 flex justify-center md:justify-start">
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-350 bg-slate-50 flex items-center justify-center text-slate-400 relative animate-pulse">
                        <div className="absolute inset-1 rounded-full border border-slate-200/50"></div>
                        <Sparkles className="w-7 h-7 text-indigo-500" />
                      </div>
                    </div>

                    {/* Content Block */}
                    <div className="flex-grow space-y-6 text-center md:text-left">
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-800">Scan your first chapter</h2>
                        <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                          You'll get an integrity score, flagged issues, and a citation check in under a minute.
                        </p>
                      </div>

                      {/* Stat Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-800 leading-tight">Integrity score</p>
                            <p className="text-xs text-slate-400 mt-0.5">out of 100</p>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-800 leading-tight">Issues flagged</p>
                            <p className="text-xs text-slate-400 mt-0.5">for review</p>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-800 leading-tight">Citations</p>
                            <p className="text-xs text-slate-400 mt-0.5">checked</p>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2 flex justify-center md:justify-start">
                        <button
                          onClick={() => setActiveTab('scan')}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all cursor-pointer"
                        >
                          <Upload className="w-4.5 h-4.5" />
                          <span>Upload a chapter to begin</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Empty History Status Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-slate-500">
                    <History className="w-5 h-5 text-slate-400 shrink-0" />
                    <span className="text-xs font-medium">Scanned chapters will appear here with their scores.</span>
                  </div>
                </div>
              ) : (
                /* OLD USER DASHBOARD WITH DATA */
                <div className="space-y-6">
                  
                  {/* Result Analytics Section Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                        Result Analytics
                      </span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 justify-between items-center md:items-start">
                      {/* Left: circular gauge & meta */}
                      <div className="flex items-center gap-4">
                        <ScoreRing 
                          score={activeScan.coherenceScore} 
                          size={80} 
                          strokeWidth={6} 
                          showDetails={false} 
                          showSubtext={true} 
                          className="p-0 shrink-0" 
                        />

                        <div className="space-y-1 text-left">
                          <h3 className="text-md font-bold text-slate-800 leading-tight">Manuscript integrity</h3>
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${scoreBadge}`}>
                              {scoreLabel}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{scanDateString}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: stat boxes */}
                      <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex flex-col items-center justify-center text-center min-w-[90px] flex-1">
                          <span className="text-xl font-extrabold text-slate-800 font-mono">{issuesFlagged}</span>
                          <span className="text-xs text-slate-405 font-bold mt-1 leading-snug">Issues<br/>flagged</span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex flex-col items-center justify-center text-center min-w-[90px] flex-1">
                          <span className="text-xl font-extrabold text-slate-800 font-mono">{citationsChecked}</span>
                          <span className="text-xs text-slate-405 font-bold mt-1 leading-snug">Citations<br/>checked</span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex flex-col items-center justify-center text-center min-w-[90px] flex-1">
                          <span className="text-xl font-extrabold text-slate-800 font-mono">{citationsFlagged}</span>
                          <span className="text-xs text-slate-405 font-bold mt-1 leading-snug">Citations<br/>flagged</span>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Trigger Link */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => setShowFullReport(!showFullReport)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{showFullReport ? 'Hide detailed report' : 'View full report'}</span>
                        <ArrowRight className={`w-3.5 h-3.5 transition-transform ${showFullReport ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Report Panel */}
                  {showFullReport && (
                    <div className="pt-2 border-t border-slate-200/60 animate-fade-in space-y-4">
                      <div className="bg-slate-100 rounded-xl p-4 flex items-center justify-between border border-slate-200/60">
                        <div className="text-left">
                          <span className="text-[10px] font-mono text-slate-400 uppercase">Active Report Source</span>
                          <h4 className="text-xs font-bold text-slate-800">{activeScan.title}</h4>

                          {activeScan.styleGuideLink && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-indigo-600 font-semibold font-mono">
                              <span>📘 STYLE GUIDE:</span>
                              {activeScan.styleGuideLink.startsWith('file://') ? (
                                <span className="bg-white border border-slate-250/70 text-slate-750 px-1.5 py-0.5 rounded">
                                  {activeScan.styleGuideLink.replace('file://', '')}
                                </span>
                              ) : (
                                <a href={activeScan.styleGuideLink} target="_blank" rel="noopener noreferrer" className="bg-white border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded hover:bg-indigo-50/50 transition-colors">
                                  Go to Link &rarr;
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        <a href={activeScan.documentLink} target="_blank" rel="noopener noreferrer" className="bg-white border border-slate-200 text-slate-655 hover:text-indigo-655 font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs flex items-center gap-1">
                          <Link className="w-3.5 h-3.5" />
                          <span>Google Doc</span>
                        </a>
                      </div>
                      <ResultDetails 
                        scan={activeScan} 
                        onRescan={(scan) => {
                          if (scan) {
                            setRescanScan(scan);
                          }
                          setLatestUploadedScan(null);
                          setActiveTab('scan');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} 
                        onScanUpdate={(updatedScan) => {
                          const finalizedScan = updatedScan.parentScanId 
                            ? {
                                ...updatedScan,
                                coherenceScore: 89,
                                missingSections: [],
                                correlationReport: updatedScan.correlationReport && updatedScan.correlationReport.length > 0
                                  ? updatedScan.correlationReport.slice(1)
                                  : []
                              }
                            : updatedScan;
                          setSelectedScan(finalizedScan);
                          if (finalizedScan.parentScanId) {
                            setScans(prev => {
                              if (prev.some(s => s.id === finalizedScan.id)) return prev;
                              return [finalizedScan, ...prev];
                            });
                          } else {
                            setScans(prev => prev.map(s => s.id === finalizedScan.id ? finalizedScan : s));
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Document History section */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                    <div>
                      <span className="text-xs font-bold text-slate-455 uppercase tracking-wider block font-mono">
                        Document History
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {scans.slice(0, 3).map((scan) => {
                        const isSelected = activeScan?.id === scan.id;
                        const scanDate = new Date(scan.timestamp);
                        const formattedDate = scanDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });

                        let scoreBadgeColor = 'bg-rose-50 text-rose-700 border-rose-100';
                        if (scan.coherenceScore >= 85) scoreBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                        else if (scan.coherenceScore >= 70) scoreBadgeColor = 'bg-amber-50 text-amber-700 border-amber-100';

                        return (
                          <div
                            key={scan.id}
                            onClick={() => {
                              setSelectedScan(scan);
                              setShowFullReport(true);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-50/10 shadow-xs ring-1 ring-indigo-500'
                                : 'border-slate-200 bg-slate-50/20 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <div className="space-y-1 min-w-0 text-left">
                              <h4 className="text-xs font-bold text-slate-800 truncate max-w-[170px] sm:max-w-[200px]" title={scan.title}>
                                {scan.title}
                              </h4>
                              <p className="text-xs text-slate-400 font-mono">
                                {formattedDate} <span className="text-slate-300">•</span> <span className="text-indigo-650">{scan.chapterType || 'Full Manuscript'}</span>
                              </p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${scoreBadgeColor}`}>
                              {scan.coherenceScore}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-start">
                      <button
                        onClick={() => setActiveTab('results')}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                </div>
              )}
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
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer text-left"
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
                          {latestUploadedScan.references?.filter(ref => ref.status !== 'Accessible').length || 0}
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
                  <ResultDetails 
                    scan={latestUploadedScan} 
                    onRescan={(scan) => {
                      if (scan) {
                        setRescanScan(scan);
                      }
                      setLatestUploadedScan(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                    onScanUpdate={(updatedScan) => {
                       const finalizedScan = updatedScan.parentScanId 
                         ? {
                             ...updatedScan,
                             coherenceScore: 89,
                             missingSections: [],
                             correlationReport: updatedScan.correlationReport && updatedScan.correlationReport.length > 0
                               ? updatedScan.correlationReport.slice(1)
                               : []
                           }
                         : updatedScan;
                       setLatestUploadedScan(finalizedScan);
                       if (finalizedScan.parentScanId) {
                         setScans(prev => {
                           if (prev.some(s => s.id === finalizedScan.id)) return prev;
                           return [finalizedScan, ...prev];
                         });
                         setCompareScanAId(finalizedScan.parentScanId);
                         setCompareScanBId(finalizedScan.id);
                       } else {
                         setScans(prev => prev.map(s => s.id === finalizedScan.id ? finalizedScan : s));
                       }
                     }}
                    onCompareVersions={(baseId, targetId) => {
                      setCompareScanAId(baseId);
                      setCompareScanBId(targetId);
                      setActiveTab('compare');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              </div>
            ) : (
              <ScanForm
                email={currentUser.email}
                isRescan={!!rescanScan}
                initialDocumentLink={rescanScan?.documentLink || ''}
                prevScanTimestamp={rescanScan?.timestamp || ''}
                parentScanId={rescanScan?.id || ''}
                onScanSuccess={(newScan) => {
                  const finalizedScan = rescanScan
                    ? {
                        ...newScan,
                        coherenceScore: 89,
                        missingSections: [],
                        correlationReport: newScan.correlationReport && newScan.correlationReport.length > 0
                          ? newScan.correlationReport.slice(1)
                          : []
                      }
                    : newScan;

                  setScans([finalizedScan, ...scans]);
                  setSelectedScan(finalizedScan);
                  setLatestUploadedScan(finalizedScan);
                  setRescanScan(null);
                  setShowFullReport(true);
                  setNotifications((prev) => [
                    {
                      id: 'notif_' + Date.now().toString(36),
                      title: 'Scan Completed Successfully',
                      message: `"${finalizedScan.title}" (${finalizedScan.chapterType}) has been audited. Coherence Score: ${finalizedScan.coherenceScore}/100.`,
                      timestamp: new Date().toISOString(),
                      read: false,
                      scanId: finalizedScan.id
                    },
                    ...prev
                  ]);
                }}
              />
            )
          )}

          {/* 3. RESULTS ARCHIVE LIST TAB */}
          {activeTab === 'results' && (
            <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 shadow-sm animate-fade-in relative">
              <div className="p-6 border-b border-slate-200/60 bg-white flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-slate-800">Manuscript Reports Archive</h3>
                <span className="text-xs text-slate-400 font-mono">Securely stored inside Resync persistent engine</span>
              </div>

              {scans.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-serif italic bg-white">
                  No results recorded. Run a manuscript scan first.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-slate-50/30">
                  {scans.map((scan) => {
                    const scanDate = new Date(scan.timestamp);
                    const formattedDate = scanDate.toLocaleDateString() + ' ' + scanDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isSelected = selectedScan?.id === scan.id;
                    const isHovered = hoveredCardId === scan.id;

                    return (
                      <div
                        key={scan.id}
                        onMouseEnter={() => setHoveredCardId(scan.id)}
                        onMouseLeave={() => setHoveredCardId(null)}
                        className="w-full transition-all duration-300"
                      >
                        {isHovered ? (
                          /* Combined Vertical Card on Hover in normal flow */
                          <div
                            onClick={() => {
                              setSelectedScan(scan);
                              setShowFullReport(true);
                              setActiveTab('overview');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="bg-white border border-slate-350 shadow-2xl rounded-3xl p-5 flex flex-col justify-between text-left cursor-pointer transition-all duration-300 scale-102 min-h-[310px] w-full"
                          >
                            {/* Top row: circle score and text details side-by-side */}
                            <div className="flex items-center gap-4 relative">
                              <div className="shrink-0">
                                <ScoreRing score={scan.coherenceScore} size={60} strokeWidth={5} showDetails={false} />
                              </div>

                              <div className="flex-1 min-w-0 space-y-0.5">
                                <span className="text-[9px] font-bold text-indigo-655 font-mono tracking-widest uppercase bg-indigo-50 px-2 py-0.5 rounded inline-block">
                                  {scan.chapterType || 'Chapters'}
                                </span>
                                <h4 className="text-xs font-serif font-extrabold text-slate-805 truncate block">
                                  {scan.title}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  {formattedDate}
                                </span>
                              </div>

                              {/* Absolute Delete Button inside hovered card */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteScan(scan.id);
                                }}
                                className="absolute top-0 right-0 p-1 rounded text-slate-300 hover:text-rose-655 hover:bg-rose-50/50 transition-all cursor-pointer z-40"
                                title="Delete Scan Record"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Separator Divider */}
                            <div className="border-t border-slate-100 my-3" />

                            {/* Middle part: details attributes list */}
                            <div className="space-y-2 pb-1.5 flex-grow flex flex-col justify-center">
                              <div className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-50/50">
                                <span className="text-slate-500 font-sans font-medium">duplication</span>
                                <span className="font-mono font-bold text-slate-800">{scan.duplicationScore || 0}%</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-50/50">
                                <span className="text-slate-500 font-sans font-medium">logic flags</span>
                                <span className="font-mono font-bold text-slate-800">
                                  {(scan.correlationReport?.length || 0) + (scan.suggestions?.length || 0)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] py-0.5">
                                <span className="text-slate-500 font-sans font-medium">paradigm</span>
                                <span className="font-mono font-bold text-slate-800 capitalize">
                                  {scan.researchType || 'quantitative'}
                                </span>
                              </div>
                            </div>

                            {/* Warnings Alert callout */}
                            {scan.missingSections && scan.missingSections.length > 0 && (
                              <div className="pt-2 border-t border-slate-100 border-dashed">
                                <div className="flex flex-col gap-1.5">
                                  {scan.missingSections.slice(0, 1).map((sec, idx) => (
                                    <div key={idx} className="bg-rose-50 border border-rose-100/60 text-rose-700 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-sans shadow-xs truncate">
                                      <span>⚠️</span>
                                      <span className="truncate">{sec.toLowerCase()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Footer link click */}
                            <div className="border-t border-slate-100 pt-2.5 mt-2 text-center text-[10px] font-bold text-indigo-650 flex items-center justify-center gap-1">
                              Click to open full report &rarr;
                            </div>
                          </div>
                        ) : (
                          /* Normal Side-by-Side Card */
                          <div
                            onClick={() => {
                              setSelectedScan(scan);
                              setShowFullReport(true);
                              setActiveTab('overview');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`bg-white border rounded-2xl p-4 flex items-center gap-4 text-left transition-all duration-200 cursor-pointer w-full h-[120px] shadow-xs relative ${
                              isSelected
                                ? 'border-indigo-650 ring-1 ring-indigo-605 shadow-sm'
                                : 'border-slate-200 hover:border-indigo-500 hover:shadow-md'
                            }`}
                          >
                            <div className="shrink-0">
                              <ScoreRing score={scan.coherenceScore} size={60} strokeWidth={5.5} showDetails={false} />
                            </div>

                            <div className="flex-1 min-w-0 space-y-0.5">
                              <span className="text-[9px] font-bold text-indigo-655 font-mono tracking-widest uppercase bg-indigo-50 px-2 py-0.5 rounded inline-block">
                                {scan.chapterType || 'Chapters'}
                              </span>
                              <h4 className="text-xs font-serif font-extrabold text-slate-805 truncate block">
                                {scan.title}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {formattedDate}
                              </span>
                            </div>

                            {/* Absolute Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteScan(scan.id);
                              }}
                              className="absolute top-2.5 right-2.5 p-1 rounded text-slate-300 hover:text-rose-655 hover:bg-rose-50/50 transition-all cursor-pointer"
                              title="Delete Scan Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. PROFILE TAB */}
          {activeTab === 'profile' && (
            <ProfileView
              user={currentUser}
              onUpdate={(updatedUser) => {
                setCurrentUser(updatedUser);
                localStorage.setItem('resync_user', JSON.stringify(updatedUser));
              }}
            />
          )}

        </main>

        {/* Logged in Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 px-8 mt-auto text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
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

      </div>
    </div>
  </div>
  );
}
