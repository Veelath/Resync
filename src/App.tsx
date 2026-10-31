import { useState, useEffect, useRef } from "react";
import type { Screen, DisplayScan } from './lib/appTypes';
import { supabase } from './lib/supabase';
import { saveSourceFile } from './lib/sourceFile';
import { readRoute, routePath } from './lib/routes';
import { getScanResult } from './services/api';
import type { Session } from '@supabase/supabase-js';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
import { PrivacyScreen } from './screens/PrivacyScreen';
import { TermsScreen } from './screens/TermsScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SignupScreen } from './screens/SignupScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ProcessingScreen } from './screens/ProcessingScreen';
import { UploadScreen } from './screens/UploadScreen';
import { DashboardScreen } from './screens/dashboard/DashboardScreen';
import { ResultsScreen } from './screens/results/ResultsScreen';
import type { V7ScanResponse } from './services/v7Result';
import { ToastBanner, loadNotifications, playCompletionChime, unlockAudio, NOTIFICATIONS_KEY, type AppNotification } from './components/ScanNotifications';

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const screenRef = useRef<Screen>("home");
  const historyIndex = useRef(0);
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [scanResult, setScanResult] = useState<DisplayScan | null>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);  // the uploaded Word file, so results can show it as written
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [resultError, setResultError] = useState('');
  const [notifications, setNotifications] = useState<AppNotification[]>(loadNotifications);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanRunRef = useRef(0);
  const scanSettledRef = useRef(true);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  function showRoute(pathname: string, index: number, currentSession = sessionRef.current) {
    const route = readRoute(pathname);
    let target = route.unknown ? (currentSession ? 'dashboard' : 'home') : route.screen;
    let path = route.unknown ? routePath(target) : pathname;
    if (target === 'processing' && scanSettledRef.current) { target = 'dashboard'; path = '/dashboard'; }
    if (!currentSession && !route.sample && ['dashboard', 'upload', 'results'].includes(target)) {
      if (route.scanId) sessionStorage.setItem('resync_return_to', routePath('results', route.scanId));
      target = 'login'; path = '/login';
    }
    if (currentSession && ['login', 'signup'].includes(target)) { target = 'dashboard'; path = '/dashboard'; }
    if (path !== window.location.pathname) window.history.replaceState({ resync: { index } }, '', path);
    historyIndex.current = index;
    screenRef.current = target;
    setScreen(target);
    setIsSampleMode(Boolean(route.sample && target === 'results'));
    setActiveScanId(target === 'results' && !route.sample ? route.scanId ?? null : null);
    setResultError('');
    sessionStorage.setItem('resync_screen', target);
  }

  function afterSignIn() {
    const returnTo = sessionStorage.getItem('resync_return_to');
    sessionStorage.removeItem('resync_return_to');
    const path = returnTo && readRoute(returnTo).scanId ? returnTo : '/dashboard';
    window.history.replaceState({ resync: { index: historyIndex.current } }, '', path);
    showRoute(path, historyIndex.current);
  }

  useEffect(() => {
    const isRecovery = window.location.pathname === '/reset-password' || window.location.hash.includes('type=recovery');

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      sessionRef.current = session;
      if (isRecovery && window.location.pathname !== '/reset-password') window.history.replaceState({ resync: { index: 0 } }, '', '/reset-password');
      showRoute(window.location.pathname, 0, session);
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      sessionRef.current = session;
      if (event === 'PASSWORD_RECOVERY') {
        window.history.replaceState({ resync: { index: historyIndex.current } }, '', '/reset-password');
        showRoute('/reset-password', historyIndex.current, session);
      } else if (event === 'SIGNED_IN' && session) {
        if (['login', 'signup', 'home'].includes(screenRef.current)) afterSignIn();
      } else if (!session) {
        if (['dashboard', 'upload', 'processing', 'results'].includes(screenRef.current) && window.location.pathname !== '/sample') {
          window.history.replaceState({ resync: { index: historyIndex.current } }, '', '/');
          showRoute('/', historyIndex.current, null);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => showRoute(window.location.pathname, event.state?.resync?.index ?? 0);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(s: Screen, asSample = false, resultId?: string) {
    if (s === 'results' && !asSample && !sessionRef.current && (resultId || scanResult?.analysis_run_id)) {
      sessionStorage.setItem('resync_return_to', routePath('results', resultId ?? scanResult?.analysis_run_id));
    }
    const target = !sessionRef.current && !asSample && ['dashboard', 'upload', 'processing', 'results'].includes(s) ? 'login'
      : sessionRef.current && (s === 'login' || s === 'signup') ? 'dashboard'
      : s;
    const transient = ['processing', 'login', 'signup', 'reset-password'];
    const replacingTransient = transient.includes(screenRef.current) && !transient.includes(target);
    const scanId = target === 'results' && !asSample ? resultId ?? scanResult?.analysis_run_id : undefined;
    const path = routePath(target, scanId, asSample);
    if (target === 'results' && !asSample && !scanId) { showRoute('/dashboard', historyIndex.current); return; }
    const entry = { index: historyIndex.current + (replacingTransient ? 0 : 1) };
    if (replacingTransient) window.history.replaceState({ resync: entry }, '', path);
    else window.history.pushState({ resync: entry }, '', path);
    historyIndex.current = entry.index;
    screenRef.current = target;
    setIsSampleMode(asSample);
    setActiveScanId(asSample ? null : scanId ?? null);
    setScreen(target);
    sessionStorage.setItem('resync_screen', target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (historyIndex.current > 0) window.history.back();
    else {
      // Nothing earlier in history: land on the dashboard when signed in, otherwise the home page.
      const fallback: Screen = sessionRef.current ? 'dashboard' : 'home';
      screenRef.current = fallback;
      setScreen(fallback);
      setIsSampleMode(false);
      sessionStorage.setItem('resync_screen', fallback);
      window.history.replaceState({ resync: { index: 0 } }, '', routePath(fallback));
    }
  }

  function pushNotification(kind: AppNotification["kind"], title: string, message: string) {
    const item: AppNotification = { id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, kind, title, message, at: Date.now(), read: false };
    setNotifications(prev => {
      const next = [item, ...prev].slice(0, 20);
      try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
    setToast(item);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 8000);
  }

  function markNotificationsRead() {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }

  // Each scan run gets one outcome (success or failure) so the sound and toast can never fire twice.
  function handleScanStart() {
    scanRunRef.current += 1;
    scanSettledRef.current = false;
    setScanResult(null);  // a rescan starts clean: the previous report and its recommendations are dropped
    setScanFile(null);
    setToast(null);
    unlockAudio();
  }

  useEffect(() => {
    if (screen !== 'results' || isSampleMode || !activeScanId || !session || scanResult?.analysis_run_id === activeScanId) return;
    let cancelled = false;
    setResultError('');
    getScanResult(activeScanId).then(result => {
      if (!cancelled) { setScanResult(result); setScanFile(null); }
    }).catch(error => {
      if (!cancelled) setResultError(error instanceof Error ? error.message : 'Unable to load this report.');
    });
    return () => { cancelled = true; };
  }, [screen, isSampleMode, activeScanId, session, scanResult?.analysis_run_id]);

  function handleScanCompleted() {
    if (scanSettledRef.current) return;
    scanSettledRef.current = true;
    const played = playCompletionChime();
    setSoundBlocked(!played);
    pushNotification("success", "Scan complete", "Your coherence report is ready to review.");
  }

  function handleScanFailed(message: string) {
    if (scanSettledRef.current) return;
    scanSettledRef.current = true;
    setSoundBlocked(false);
    pushNotification("error", "Scan did not finish", message);
  }

  function enableSound() {
    unlockAudio();
    setTimeout(() => setSoundBlocked(!playCompletionChime()), 100);
  }

  function handleLoginSuccess() {
    if (screenRef.current === 'login') afterSignIn();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    sessionStorage.setItem('resync_screen', 'home');
    screenRef.current = 'home';
    setScreen('home');
    window.history.replaceState({ resync: { index: historyIndex.current } }, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (screen === 'privacy') {
    return <PrivacyScreen />;
  }

  if (screen === 'terms') {
    return <TermsScreen />;
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white">
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}} @keyframes slide-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} .animate-slide-in{animation:slide-in .3s ease forwards}`}</style>
      <ToastBanner
        toast={toast}
        soundBlocked={soundBlocked}
        onView={scanResult && screen !== "results" ? () => { setToast(null); navigate("results"); } : undefined}
        onEnableSound={enableSound}
        onClose={() => setToast(null)}
      />
      {screen === "home" && <HomeScreen onNavigate={navigate} session={session} />}
      {screen === "upload" && <UploadScreen onNavigate={navigate} onBack={goBack} session={session} onScanStart={handleScanStart} onScanFailed={handleScanFailed} onScanComplete={(result, file) => { setScanResult(result); setScanFile(file); if (file && result.analysis_run_id) void saveSourceFile(result.analysis_run_id, file); handleScanCompleted(); navigate("results", false, result.analysis_run_id); }} />}
      {screen === "processing" && <ProcessingScreen onNavigate={navigate} />}
      {screen === "results" && (isSampleMode || (scanResult?.result_version === 'v7' && scanResult.analysis_run_id === activeScanId)
        ? <ResultsScreen onNavigate={navigate} onBack={goBack} scan={scanResult as V7ScanResponse} isSample={isSampleMode} sourceFile={scanFile} />
        : <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p>{resultError || (activeScanId && scanResult?.analysis_run_id !== activeScanId ? 'Loading report…' : scanResult ? 'This scan was made with an older version of ReSync. Please run a new scan.' : 'No scan result is available. Please run a new scan.')}</p>
            <button type="button" onClick={() => navigate('upload')} className="rounded-lg bg-indigo-600 px-5 py-2 text-white">New scan</button>
          </div>)}
      {screen === "login" && <LoginScreen onNavigate={navigate} onBack={goBack} onLoginSuccess={handleLoginSuccess} />}
      {screen === "signup" && <SignupScreen onNavigate={navigate} onBack={goBack} onSignupSuccess={() => navigate("dashboard")} />}
      {screen === "reset-password" && <ResetPasswordScreen onNavigate={navigate} onBack={goBack} />}
      {screen === "dashboard" && <DashboardScreen onNavigate={navigate} session={session} onLogout={handleLogout} notifications={notifications} onMarkNotificationsRead={markNotificationsRead} onOpenReport={() => scanResult && navigate("results")} />}
    </div>
  );
}



