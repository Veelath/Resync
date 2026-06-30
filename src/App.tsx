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
  X
} from 'lucide-react';
import ScanForm from './components/ScanForm.tsx';
import ResultDetails from './components/ResultDetails.tsx';
import ProfileView from './components/ProfileView.tsx';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  
  // Auth Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [role, setRole] = useState('Researcher');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // System Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'scan' | 'results' | 'profile'>('overview');
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Scans State
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

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
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, institution, role })
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
    localStorage.removeItem('resync_user');
    setActiveTab('overview');
  };

  const handleDeleteScan = async (scanId: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete this scan from history?')) return;

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
      }
    } catch (err) {
      console.error('Delete scan failed:', err);
    }
  };

  const latestScan = scans[0] || null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 flex flex-col justify-between">
      
      {/* Top Header / Navigation */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-slate-900">Resync</span>
              <span className="text-[10px] block font-mono text-indigo-600 uppercase tracking-wider font-bold">Manuscript Coherence</span>
            </div>
          </div>

          {/* Navigation Items (for logged-in users) */}
          {currentUser ? (
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex items-center gap-1.5">
                {[
                  { id: 'overview', label: 'Dashboard', icon: Layers },
                  { id: 'scan', label: 'Upload & Scan', icon: Compass },
                  { id: 'results', label: 'Results Audit', icon: FileSpreadsheet },
                  { id: 'profile', label: 'Academic Profile', icon: GraduationCap }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        if (item.id === 'overview' && scans.length > 0) {
                          setSelectedScan(scans[0]);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                        activeTab === item.id
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* User Dropdown / Log Out */}
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{currentUser.institution || 'Independent Researcher'}</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Secure Logout"
                  className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-mono text-slate-400 hidden md:inline-block">Document Assurance Tool v2.4</span>
              <button
                onClick={() => {
                  setAuthTab('login');
                  setAuthError('');
                  setShowAuthModal(true);
                }}
                className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setAuthTab('register');
                  setAuthError('');
                  setShowAuthModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* LANDING PAGE / REGISTER FLOW (When not logged in) */}
        {!currentUser ? (
          <div className="space-y-16 py-6 animate-fade-in">
            
            {/* Elegant Hero Title Section */}
            <div className="text-center max-w-4xl mx-auto space-y-8">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Document Coherence & Citation Auditor
              </div>
              <h1 className="font-serif text-4xl sm:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                Defend with complete <br />
                <span className="text-indigo-600 relative inline-block">
                  document consistency.
                  <span className="absolute left-0 bottom-1 w-full h-2 bg-indigo-100/70 -z-10 rounded"></span>
                </span>
              </h1>
              <p className="text-slate-500 text-md sm:text-lg max-w-2xl mx-auto leading-relaxed font-sans">
                Resync runs advanced semantic audits on your research papers and manuscripts. Upload your Google Docs link to immediately diagnose section gaps, terminology clashes, and link availability before submitting.
              </p>
              
              {/* Primary Call to Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <button
                  onClick={() => {
                    setAuthTab('register');
                    setAuthError('');
                    setShowAuthModal(true);
                  }}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Get Started — Free <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setAuthTab('login');
                    setAuthError('');
                    setShowAuthModal(true);
                  }}
                  className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-sm px-8 py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                >
                  Access Workspace
                </button>
              </div>
            </div>

            {/* How It Works Progression Stepper */}
            <div className="pt-12 border-t border-slate-200/80 space-y-8">
              <div className="text-center space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 font-mono">Streamlined Diagnostics</span>
                <h3 className="font-serif text-2xl font-bold text-slate-800">Resync Scanning Pipeline</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">See how Resync audits your Google Docs for defense readiness in three simple steps.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-xl border border-slate-200/60 p-6 space-y-4 relative">
                  <span className="absolute top-4 right-4 text-4xl font-extrabold text-slate-100 font-serif">01</span>
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Link className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif font-bold text-slate-800 text-base">Paste Shared Link</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Paste a Google Docs link of your dissertation chapter. Set it to 'Anyone with the link can view' for instant retrieval.
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/60 p-6 space-y-4 relative">
                  <span className="absolute top-4 right-4 text-4xl font-extrabold text-slate-100 font-serif">02</span>
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif font-bold text-slate-800 text-base">AI Logical Audit</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Our AI models inspect cross-section coherence to ensure methodology rules align perfectly with results and introductory claims.
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/60 p-6 space-y-4 relative">
                  <span className="absolute top-4 right-4 text-4xl font-extrabold text-slate-100 font-serif">03</span>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif font-bold text-slate-800 text-base">Defend Confidently</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Review structured discrepancy cards, download suggestions, and verify live access parameters for all cited links.
                  </p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          
          /* LOGGED IN WORKSPACE DASHBOARD */
          <div className="space-y-8 animate-fade-in">
            {/* Header Title Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider font-mono">Resync Academic Workspace</span>
                <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {activeTab === 'overview' ? 'Manuscript diagnosis' : 
                   activeTab === 'scan' ? 'New Consistency Scan' : 
                   activeTab === 'results' ? 'Historical Scan Reports' : 'Academic Profile Setup'}
                </h1>
              </div>

              {activeTab !== 'scan' && (
                <button
                  onClick={() => setActiveTab('scan')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all self-start md:self-center cursor-pointer group"
                >
                  <span>Run new manuscript scan</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>

            {/* Render Active View Panels */}

            {/* 1. OVERVIEW / DASHBOARD TAB */}
            {activeTab === 'overview' && (() => {
              // Calculate metrics dynamically
              const totalScans = scans.length;
              const avgCoherence = totalScans > 0 
                ? Math.round(scans.reduce((acc, s) => acc + s.coherenceScore, 0) / totalScans)
                : '—';
              const issuesFlagged = totalScans > 0
                ? scans.reduce((acc, s) => acc + (s.correlationReport?.length || 0) + (s.suggestions?.length || 0), 0)
                : '—';
              const citationsChecked = totalScans > 0
                ? scans.reduce((acc, s) => acc + (s.references?.length || 0), 0)
                : '—';

              return (
                <div className="space-y-8 animate-fade-in">
                  {/* Metrics Stats Bar */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total scans', value: totalScans },
                      { label: 'Average coherence', value: avgCoherence, suffix: avgCoherence !== '—' ? '%' : '' },
                      { label: 'Issues flagged', value: issuesFlagged },
                      { label: 'Citations checked', value: citationsChecked }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white rounded-xl border border-slate-200/85 p-5 shadow-sm">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {stat.label}
                        </span>
                        <span className="font-mono text-2xl font-extrabold text-slate-900">
                          {stat.value}{stat.suffix}
                        </span>
                      </div>
                    ))}
                  </div>

                  {scans.length === 0 ? (
                    /* IF NO HISTORY YET: Show only metrics bar and empty history card */
                    <div className="space-y-6 pt-4">
                      <h3 className="font-serif text-xl font-bold text-slate-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-600" /> Diagnostic results history
                      </h3>
                      <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center">
                          <History className="w-6 h-6" />
                        </div>
                        <div className="space-y-1.5">
                          <h4 className="font-serif text-base font-bold text-slate-700">No scan history yet</h4>
                          <p className="text-xs text-slate-400 max-w-xs mx-auto">
                            Your past reports will appear here once you run a scan.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* IF HAS HISTORY: Show Active Scan Report on top, and History Log Grid on bottom */
                    <>
                      {/* On Top: What they prompted/scan (active scan details) */}
                      {selectedScan && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="bg-white rounded-xl border border-slate-200/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border-l-4 border-l-indigo-600">
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 font-mono">Latest Scan Report / Analytics</span>
                              <h2 className="font-serif text-xl font-bold text-slate-800">{selectedScan.title}</h2>
                              <p className="text-xs text-slate-400">
                                Source Link: <a href={selectedScan.documentLink} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline inline-flex items-center gap-1 font-mono">{selectedScan.documentLink}</a>
                              </p>
                            </div>
                            <button
                              onClick={() => setActiveTab('scan')}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-center cursor-pointer"
                            >
                              <PlusCircle className="w-4 h-4" /> Scan Another Document
                            </button>
                          </div>
                          <ResultDetails scan={selectedScan} />
                        </div>
                      )}

                      {/* On Bottom: Results history (full width grid) */}
                      <div className="border-t border-slate-200/80 pt-8 space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-serif text-xl font-bold text-slate-800 flex items-center gap-2">
                              <History className="w-5 h-5 text-indigo-650" /> Diagnostic results history
                            </h3>
                            <p className="text-xs text-slate-400">Select any previous manuscript diagnostics scan to view its report above.</p>
                          </div>
                          <span className="text-xs text-indigo-650 bg-indigo-55 px-2.5 py-1 rounded-md font-semibold">
                            {scans.length} Scans Found
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {scans.map((scan) => {
                            const isSelected = selectedScan?.id === scan.id;
                            return (
                              <div
                                key={scan.id}
                                onClick={() => {
                                  setSelectedScan(scan);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`p-5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between gap-4 h-[160px] relative ${
                                  isSelected
                                    ? 'border-indigo-500 bg-indigo-50/10 shadow-md ring-1 ring-indigo-500'
                                    : 'border-slate-200 hover:border-slate-350 hover:-translate-y-1 hover:shadow-md bg-white'
                                }`}
                              >
                                <div className="space-y-1.5 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                      scan.coherenceScore >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
                                      scan.coherenceScore >= 70 ? 'bg-amber-50 text-amber-700 border-amber-250' :
                                      'bg-rose-50 text-rose-700 border-rose-250'
                                    }`}>
                                      Score: {scan.coherenceScore}
                                    </span>
                                    
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteScan(scan.id);
                                      }}
                                      title="Delete from history"
                                      className="p-1 text-slate-350 hover:text-rose-650 rounded hover:bg-slate-50 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  
                                  <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug">{scan.title}</h4>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                                  <span className="font-mono">{new Date(scan.timestamp).toLocaleDateString()}</span>
                                  <span className="font-semibold bg-slate-50 px-2 py-0.5 rounded truncate max-w-[130px]">{scan.chapterType}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* 2. SCAN FORM TAB */}
            {activeTab === 'scan' && (
              <ScanForm
                email={currentUser.email}
                onScanSuccess={(newScan) => {
                  setScans([newScan, ...scans]);
                  setSelectedScan(newScan);
                  setActiveTab('overview');
                }}
              />
            )}

            {/* 3. RESULTS ARCHIVE LIST TAB */}
            {activeTab === 'results' && (
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-slate-800">Manuscript Scans Archive</h3>
                  <span className="text-xs text-slate-400 font-mono">Securely stored inside Resync persistent engine</span>
                </div>

                {scans.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-serif italic">
                    No results recorded. Run a manuscript scan first.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-4">Manuscript Title</th>
                          <th className="p-4">Chapter category</th>
                          <th className="p-4">Date scanned</th>
                          <th className="p-4">Coherence Score</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-slate-100">
                        {scans.map((scan) => (
                          <tr key={scan.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-bold text-slate-800 font-serif">
                              {scan.title}
                            </td>
                            <td className="p-4 text-xs font-semibold text-slate-500">
                              {scan.chapterType}
                            </td>
                            <td className="p-4 text-xs text-slate-400 font-mono">
                              {new Date(scan.timestamp).toLocaleDateString()} {new Date(scan.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="p-4">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                                scan.coherenceScore >= 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                scan.coherenceScore >= 70 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {scan.coherenceScore} / 100
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  onClick={() => {
                                    setSelectedScan(scan);
                                    setActiveTab('overview');
                                  }}
                                  className="text-xs text-indigo-600 font-bold hover:underline"
                                >
                                  Open Report
                                </button>
                                <button
                                  onClick={() => handleDeleteScan(scan.id)}
                                  className="text-slate-300 hover:text-rose-600 transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-400">
              <Sparkles className="w-3 h-3" />
            </div>
            <span className="font-serif font-bold text-slate-700">Resync</span>
            <span>— AI-Powered Coherence & Citation Auditor</span>
          </div>
          <div className="flex gap-4">
            <span className="font-mono">Secure TLS Cloud Node</span>
            <span>•</span>
            <span className="font-mono">Gemini 3.5 Diagnostic Sandbox</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/95 shadow-2xl overflow-hidden max-w-md w-full p-8 relative space-y-6">
            
            {/* Close Button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              title="Close Panel"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Auth Tabs Toggle */}
            <div className="flex border-b border-slate-100 pb-3">
              <button
                onClick={() => { setAuthTab('login'); setAuthError(''); }}
                className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                  authTab === 'login' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => { setAuthTab('register'); setAuthError(''); }}
                className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                  authTab === 'register' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
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
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Your Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Evelyn Sterling"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Affiliation (Optional)</label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="e.g. Independent, Company, University"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>
                </>
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

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-6 cursor-pointer"
              >
                {authLoading ? 'Authenticating...' : authTab === 'login' ? 'Access Workspace' : 'Initialize Account'}
              </button>
            </form>

            <div className="text-center pt-2">
              <p className="text-[10px] text-slate-400 font-mono">Secure TLS 1.3 Encryption Standard</p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
