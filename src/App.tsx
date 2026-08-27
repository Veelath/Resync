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
  FileSpreadsheet,
  GraduationCap,
  PlusCircle,
  BookOpen,
  Upload,
  Trash2,
  LayoutGrid,
  User as UserIcon,
  Lock
} from 'lucide-react';
import ScanForm from './components/ScanForm.js';
import { supabase } from './lib/supabase.js';
import ResultDetails from './components/ResultDetails.tsx';
import ProfileView, { CreditHistoryPanel } from './components/ProfileView.tsx';
import ScoreRing from './components/ScoreRing.tsx';
import TopUpModal from './components/TopUpModal.tsx';
import { getScoreTier } from './utils.js';
import { getCreditBalance } from './services/api.js';
import logoPng from './assets/logo.png';

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

  // Archive Filter & Search
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'high' | 'needs_review'>('all');
  const [archiveSearch, setArchiveSearch] = useState('');

  // System Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'scan' | 'results' | 'profile'>('overview');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);
  
  // Scans State
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
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



  // Live Hover Preview State for History/Archive Reports
  const [hoveredScan, setHoveredScan] = useState<ScanResult | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

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

  // Sync scan history when user changes or returns to overview/results
  useEffect(() => {
    if (currentUser) {
      fetchScanHistory();
    }
  }, [currentUser]);

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

  const fetchScanHistory = async () => {
    if (!currentUser) return;
    setHistoryLoading(true);
    try {
      const userId = currentUser.id;
      if (!userId) {
        console.warn('[Resync] fetchScanHistory: no user UUID available, skipping.');
        return;
      }

      // Query Supabase directly — analysis_run table with joined inconsistency and citation children
      const { data, error } = await supabase
        .from('analysis_run')
        .select(`
          analysis_run_id,
          doc_url,
          overall_coherence_score,
          created_at,
          status,
          sections_analyzed,
          missing_sections,
          has_all_required_sections,
          inconsistencies_found,
          citations_audited,
          structural_completeness_score,
          cross_chapter_coherence_score,
          citation_integrity_score,
          functional_metric_score,
          functional_metric_band,
          biggest_lever_detail,
          score_breakdown_json,
          inconsistency (
            analysis_run_id, section_a, section_b, coherence_score,
            explanation_what, explanation_why, suggested_fix, severity,
            evidence_a, evidence_b, evidence_verified, objectives_unaddressed
          ),
          citation (
            analysis_run_id, citation_raw_reference_text, citation_is_accessible,
            citation_status, citation_primary_link, citation_authors_parsed,
            citation_year_parsed, citation_crossref_title, citation_title_match_score,
            citation_is_cited_in_text
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('[Resync] Supabase history fetch error:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const mapped: ScanResult[] = data.map((row: any) => ({
          id: row.analysis_run_id,
          userId: userId,
          title: row.doc_url ? row.doc_url.slice(0, 60) : 'Manuscript Scan',
          documentLink: row.doc_url,
          chapterType: 'Full Manuscript',
          coherenceScore: Math.round(row.overall_coherence_score ?? 0),
          overall_coherence_score: row.overall_coherence_score,
          overallAssessment: `Coherence Score: ${Math.round(row.overall_coherence_score ?? 0)}/100`,
          inconsistencies: (row.inconsistency || []).map((inc: any) => ({
            section_a: inc.section_a,
            section_b: inc.section_b,
            coherence_score: inc.coherence_score,
            explanation_what: inc.explanation_what,
            explanation_why: inc.explanation_why,
            suggested_fix: inc.suggested_fix,
            // Previously dropped on reload entirely -- see migration 007.
            evidence_a: inc.evidence_a,
            evidence_b: inc.evidence_b,
            evidence_verified: inc.evidence_verified,
            objectives_unaddressed: inc.objectives_unaddressed,
            sectionA: inc.section_a,
            sectionB: inc.section_b,
            description: inc.explanation_what,
            howToFix: inc.suggested_fix,
            severity: inc.severity || 'Medium',
            inconsistencyType: 'contradiction' as const,
          })),
          correlationReport: (row.inconsistency || []).map((inc: any) => ({
            section_a: inc.section_a,
            section_b: inc.section_b,
            coherence_score: inc.coherence_score,
            explanation_what: inc.explanation_what,
            explanation_why: inc.explanation_why,
            suggested_fix: inc.suggested_fix,
            evidence_a: inc.evidence_a,
            evidence_b: inc.evidence_b,
            evidence_verified: inc.evidence_verified,
            objectives_unaddressed: inc.objectives_unaddressed,
            sectionA: inc.section_a,
            sectionB: inc.section_b,
            description: inc.explanation_what,
            howToFix: inc.suggested_fix,
            severity: inc.severity || 'Medium',
            inconsistencyType: 'contradiction' as const,
          })),
          citations: (row.citation || []).map((cit: any) => ({
            citation_raw_reference_text: cit.citation_raw_reference_text,
            citation_is_accessible: cit.citation_is_accessible,
            citation_status: cit.citation_status,
            citation_primary_link: cit.citation_primary_link,
            citation_authors_parsed: cit.citation_authors_parsed,
            citation_year_parsed: cit.citation_year_parsed,
            citation_crossref_title: cit.citation_crossref_title,
            citation_title_match_score: cit.citation_title_match_score,
            citation_is_cited_in_text: cit.citation_is_cited_in_text,
            citation: cit.citation_raw_reference_text,
            status: cit.citation_is_accessible ? 'Accessible' : 'Broken Link',
            explanation: cit.citation_is_accessible ? 'Verified accessible reference.' : 'Unreachable or broken reference link.',
          })),
          references: (row.citation || []).map((cit: any) => ({
            citation_raw_reference_text: cit.citation_raw_reference_text,
            citation_is_accessible: cit.citation_is_accessible,
            citation_status: cit.citation_status,
            citation_primary_link: cit.citation_primary_link,
            citation_authors_parsed: cit.citation_authors_parsed,
            citation_year_parsed: cit.citation_year_parsed,
            citation_crossref_title: cit.citation_crossref_title,
            citation_title_match_score: cit.citation_title_match_score,
            citation_is_cited_in_text: cit.citation_is_cited_in_text,
            citation: cit.citation_raw_reference_text,
            status: cit.citation_is_accessible ? 'Accessible' : 'Broken Link',
            explanation: cit.citation_is_accessible ? 'Verified accessible reference.' : 'Unreachable or broken reference link.',
          })),
          score_breakdown: row.functional_metric_score != null ? {
            overall_score: row.functional_metric_score,
            band: row.functional_metric_band || '',
            structural_completeness_score: row.structural_completeness_score,
            cross_chapter_coherence_score: row.cross_chapter_coherence_score,
            citation_integrity_score: row.citation_integrity_score,
            biggest_lever: row.biggest_lever_detail || null,
            // Strong Coherence tab's calibrated role-pair scores +
            // verification notes live in this jsonb blob -- without it,
            // a history-loaded scan shows an empty Strong Coherence tab.
            coherence_detail: row.score_breakdown_json?.coherence_detail,
          } : undefined,
          verifications: row.score_breakdown_json?.coherence_detail?.verifications || [],
          suggestions: [],
          timestamp: row.created_at,
          supportingDoc: '',
          styleGuideLink: '',
          missing_sections: row.missing_sections || [],
          missingSections: row.missing_sections || [],
          sections_analyzed: row.sections_analyzed || [],
          has_all_required_sections: row.has_all_required_sections ?? true,
          researchType: 'quantitative',
          analysis_run_id: row.analysis_run_id,
          status: row.status,
        }));
        setScans(mapped);
        if (mapped.length > 0 && !selectedScan) setSelectedScan(mapped[0]);
      }
    } catch (err) {
      console.error('[Resync] fetchScanHistory failed:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

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
      setAuthError(err.message || 'Authentication failed.');
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
        institution,
        role,
        bio: '',
      };
      setCurrentUser(userObj);
      localStorage.setItem('resync_user', JSON.stringify(userObj));
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed.');
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
      setAuthError(err.message || 'Failed to send recovery instructions.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSelectedScan(null);
    setScans([]);
    setLatestUploadedScan(null);
    localStorage.removeItem('resync_user');
    setActiveTab('overview');
  };

  const handleDeleteScan = async (scanId: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete this scan from history?')) return;

    const deletedScan = scans.find(s => s.id === scanId);
    try {
      const { error } = await supabase
        .from('analysis_run')
        .delete()
        .eq('analysis_run_id', scanId)
        .eq('user_id', currentUser.id || '');

      if (error) throw new Error(error.message);

      setScans(scans.filter(s => s.id !== scanId));
      if (selectedScan && selectedScan.id === scanId) {
        const remaining = scans.filter(s => s.id !== scanId);
        setSelectedScan(remaining.length > 0 ? remaining[0] : null);
      }

      setNotifications(prev => [{
        id: 'notif_' + Date.now().toString(36),
        title: 'Scan Record Deleted',
        message: `The scan record "${deletedScan?.title || 'Unknown'}" was deleted from history.`,
        timestamp: new Date().toISOString(),
        read: false,
        scanId: undefined,
      }, ...prev]);
    } catch (err: any) {
      console.error('[Resync] Delete scan failed:', err.message);
    }
  };

  const latestScan = scans[0] || null;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 flex flex-col justify-between">
        
        {/* Top Header / Navigation */}
        <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            
            {/* Logo & Platform Name */}
            <div className="flex items-center gap-3">
              <img src={logoPng} alt="Resync Logo" className="h-9 w-auto object-contain select-none" />
              <div className="border-l border-slate-200 pl-3">
                <span className="text-xs block font-mono text-indigo-650 uppercase tracking-wider font-bold">Manuscript Coherence</span>
              </div>
            </div>

            {/* Auth Actions */}
            <div className="flex items-center gap-4">
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
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-16 py-6 animate-fade-in">
            
            {/* Elegant Hero Title Section */}
            <div className="text-center max-w-4xl mx-auto space-y-8">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Document Coherence
              </div>
              <h1 className="font-serif text-4xl sm:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                Even great research has gaps. <br />
                <span className="text-indigo-600 relative inline-block">
                  Resync finds them first.
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
                  Get Started <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setAuthTab('login');
                    setAuthError('');
                    setShowAuthModal(true);
                  }}
                  className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-sm px-8 py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                >
                  Log In
                </button>
              </div>
            </div>

            {/* How It Works Progression Stepper */}
            <div className="pt-12 border-t border-slate-200/80 space-y-8">
              <div className="text-center space-y-2">
                <span className="text-xs uppercase font-bold tracking-wider text-indigo-650 font-mono">Streamlined Diagnostics</span>
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
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 mt-16 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
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
          </div>
        </footer>

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
                      authTab === 'login' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => { setAuthTab('register'); setAuthError(''); setForgotSuccess(false); setEmail(''); setPassword(''); setConfirmPassword(''); }}
                    className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                      authTab === 'register' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
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
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4 cursor-pointer"
                  >
                    {authLoading ? 'Sending...' : forgotSuccess ? 'Reset Link Dispatched' : 'Send Recovery Instructions'}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setAuthTab('login'); setAuthError(''); setForgotSuccess(false); setEmail(''); setPassword(''); setConfirmPassword(''); }}
                      className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
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
                          className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
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
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-6 cursor-pointer"
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
                      disabled={isScanning}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        if (item.id === 'scan') {
                          setLatestUploadedScan(null);
                        }
                        if (item.id === 'overview' && scans.length > 0) {
                          setSelectedScan(scans[0]);
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                        isScanning ? 'opacity-50 cursor-not-allowed' : ''
                      } ${
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
              {/* Credits Badge */}
              <button
                onClick={() => setShowTopUpModal(true)}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-indigo-100 shadow-sm"
                title="Top up scan credits"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Credits: {scanCredits}</span>
              </button>

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
                disabled={isScanning}
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (item.id === 'scan') {
                    setLatestUploadedScan(null);
                  }
                  if (item.id === 'overview' && scans.length > 0) {
                    setSelectedScan(scans[0]);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isScanning ? 'opacity-50 cursor-not-allowed' : ''
                } ${
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
                      <ResultDetails scan={activeScan} />
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
                  setScans([newScan, ...scans]);
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

          {/* 3. RESULTS ARCHIVE LIST TAB */}
          {activeTab === 'results' && (() => {
            const highScoreCount = scans.filter(s => (s.overall_coherence_score ?? s.coherenceScore) >= 80).length;
            const needsReviewCount = scans.filter(s => (s.overall_coherence_score ?? s.coherenceScore) < 80).length;

            const filteredScans = scans.filter((s) => {
              const score = s.overall_coherence_score ?? s.coherenceScore;
              const matchesFilter =
                archiveFilter === 'all' ? true :
                archiveFilter === 'high' ? score >= 80 :
                score < 80;

              const matchesSearch = archiveSearch.trim() === '' ||
                s.title.toLowerCase().includes(archiveSearch.toLowerCase()) ||
                (s.chapterType && s.chapterType.toLowerCase().includes(archiveSearch.toLowerCase()));

              return matchesFilter && matchesSearch;
            });

            return (
              <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 shadow-sm animate-fade-in relative">
                {/* Header with Title and Search/Filters */}
                <div className="p-6 border-b border-slate-200/60 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-slate-800">Manuscript Reports Archive</h3>
                    <span className="text-xs text-slate-400 font-mono">Securely stored inside Resync persistent engine</span>
                  </div>

                  {/* Filter Chips and Search Bar */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={archiveSearch}
                        onChange={(e) => setArchiveSearch(e.target.value)}
                        placeholder="Search reports..."
                        className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 w-44 sm:w-56 transition-all"
                      />
                      {archiveSearch && (
                        <button
                          onClick={() => setArchiveSearch('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setArchiveFilter('all')}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          archiveFilter === 'all'
                            ? 'bg-white text-indigo-700 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        All ({scans.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchiveFilter('high')}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          archiveFilter === 'high'
                            ? 'bg-white text-emerald-700 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        High Score ({highScoreCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchiveFilter('needs_review')}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          archiveFilter === 'needs_review'
                            ? 'bg-white text-rose-700 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Needs Review ({needsReviewCount})
                      </button>
                    </div>
                  </div>
                </div>

                {filteredScans.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-serif italic bg-white">
                    {scans.length === 0
                      ? 'No results recorded. Run a manuscript scan first.'
                      : 'No manuscript reports match your active search or filter.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-slate-50/30">
                    {filteredScans.map((scan) => {
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
                                <span className="text-slate-500 font-sans font-medium">citation integrity</span>
                                <span className="font-mono text-[10px] font-bold text-slate-600">
                                  {scan.score_breakdown?.citation_integrity_score != null ? `${Math.round(scan.score_breakdown.citation_integrity_score)}/100` : 'N/A'}
                                </span>
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
          );
        })()}


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

