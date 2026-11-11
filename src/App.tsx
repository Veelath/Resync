import { useState, useEffect, useRef } from "react";
import type { Screen, DisplayScan } from './lib/appTypes';
import { supabase } from './lib/supabase';
import { clearAllSourceFiles } from './lib/sourceFile';
import { readRoute, routePath } from './lib/routes';
import { getScanResult, subscribeSessionEnded, notifySessionEnded } from './services/api';
import { createSignOutController } from './lib/signOutController';
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
import { PAYMENT_EVENT } from './lib/paymentProof';
import { resumeManuscriptScan, ScanOutcome } from './services/api';
import { canResume, shouldNotifyFailure, rememberFailureNotification } from './lib/scanWait';
import { askForDesktopAlerts, showDesktopAlert } from './components/ScanNotifications';
import { ToastBanner, loadNotifications, loadNotificationPrefs, saveNotificationPrefs, playCompletionChime, unlockAudio, NOTIFICATIONS_KEY, type AppNotification, type NotificationPrefs } from './components/ScanNotifications';

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const screenRef = useRef<Screen>("home");
  const historyIndex = useRef(0);
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [scanResult, setScanResult] = useState<DisplayScan | null>(null);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [resultError, setResultError] = useState('');
  const [notifications, setNotifications] = useState<AppNotification[]>(loadNotifications);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(loadNotificationPrefs);
  // Scan callbacks run long after they were created, so they read the current choice from here.
  const notificationPrefsRef = useRef(notificationPrefs);
  notificationPrefsRef.current = notificationPrefs;
  const [toast, setToast] = useState<AppNotification | null>(null);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanRunRef = useRef(0);
  const scanSettledRef = useRef(true);
  const [scanRunning, setScanRunning] = useState(false);
  const [scanSending, setScanSending] = useState(false);
  const [scanOutcome, setScanOutcome] = useState<ScanOutcome | null>(null);
  const [scanStartedAt, setScanStartedAt] = useState(Date.now());
  const [scanWords, setScanWords] = useState<number | null>(null);
  const scanWordsRef = useRef<number | null>(null);
  const [dashboardNotice, setDashboardNotice] = useState<string | null>(null);
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionEndedNotice, setSessionEndedNotice] = useState(false);
  const signOutRef = useRef<ReturnType<typeof createSignOutController> | null>(null);
  if (!signOutRef.current) signOutRef.current = createSignOutController(async () => {
    clearActiveScan();
    await clearAllSourceFiles();
    await supabase.auth.signOut({ scope: 'local' });
  }, ended => {
    sessionRef.current = null;
    setSession(null);
    setSessionEndedNotice(ended);
    const target = ended ? 'login' : 'home';
    sessionStorage.setItem('resync_screen', target);
    screenRef.current = target;
    setScreen(target);
    window.history.replaceState({ resync: { index: historyIndex.current } }, '', ended ? '/login' : '/');
  });

  useEffect(() => subscribeSessionEnded(() => {
    if (sessionRef.current && !signOutRef.current?.busy()) void signOutRef.current?.run(true);
  }), []);

  function showRoute(pathname: string, index: number, currentSession = sessionRef.current) {
    const route = readRoute(pathname);
    let target = route.unknown ? (currentSession ? 'dashboard' : 'home') : route.screen;
    let path = route.unknown ? routePath(target) : pathname;
    if (target === 'processing' && scanSettledRef.current && !readActiveScan()) { target = 'dashboard'; path = '/dashboard'; }
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
      const wasSignedIn = Boolean(sessionRef.current);
      if (!session && signOutRef.current?.busy()) return;
      if (!session && wasSignedIn) {
        notifySessionEnded();
        return;
      }
      setSession(session);
      sessionRef.current = session;
      if (session) { signOutRef.current?.reset(); setSessionEndedNotice(false); }
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

  function pushNotification(kind: AppNotification["kind"], title: string, message: string, scanId?: string) {
    // With alerts off the scan is still listed in the bell, but marked read and without a pop-up.
    const quiet = !notificationPrefsRef.current.alerts;
    const item: AppNotification = { id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, kind, title, message, at: Date.now(), read: quiet, ...(scanId ? { scanId } : {}) };
    setNotifications(prev => {
      const next = [item, ...prev].slice(0, 20);
      try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
    if (quiet) return;
    setToast(item);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 8000);
  }

  // Paying (by card or by uploading proof) lands in the bell and pops up like a finished scan does.
  useEffect(() => {
    const onPayment = (event: Event) => {
      const { credits, amount } = (event as CustomEvent<{ credits: number; amount: number }>).detail;
      pushNotification("success", "Payment received", `₱${amount.toLocaleString("en-PH")} paid. ${credits} scan credit${credits === 1 ? "" : "s"} added to your balance.`);
    };
    window.addEventListener(PAYMENT_EVENT, onPayment);
    return () => window.removeEventListener(PAYMENT_EVENT, onPayment);
  }, []);

  function markNotificationsRead() {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }

  // A scan that was running when the page was refreshed keeps running on the server: pick it up again and tell the person when it ends.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (!session || resumedRef.current || scanRunRef.current > 0) return;   // a scan started on this page is already being followed
    const running = readActiveScan();
    if (!running || !canResume(running, session.user.id, Date.now())) return;
    resumedRef.current = true;
    scanSettledRef.current = false;
    setScanRunning(true);
    setScanStartedAt(running.at); setScanWords(running.words ?? null);
    let resumedProcessing = false;
    resumeManuscriptScan(running.id, { startedAt: running.at, onProcessing: () => { resumedProcessing = true; navigate('processing'); } }).then(result => {
      setScanResult(result);
      handleScanCompleted(result);
      if (!resumedProcessing || screenRef.current === 'processing') navigate("results", false, result.analysis_run_id);
    }).catch(error => handleScanFailed(error, true));
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // Each scan run gets one outcome (success or failure) so the sound and toast can never fire twice.
  // The running scan's id is kept in this browser, so a refresh or a closed tab does not lose the scan.
  const ACTIVE_SCAN_KEY = "resync-active-scan";
  function rememberActiveScan(analysisRunId: string) {
    const at = Date.now(); setScanStartedAt(at);
    try { localStorage.setItem(ACTIVE_SCAN_KEY, JSON.stringify({ id: analysisRunId, userId: sessionRef.current?.user?.id, at, words: scanWordsRef.current })); } catch { /* storage unavailable */ }
  }
  function clearActiveScan() { try { localStorage.removeItem(ACTIVE_SCAN_KEY); localStorage.removeItem("resync_active_scan"); } catch { /* storage unavailable */ } }
  function readActiveScan(): { id: string; userId?: string; at: number; words?: number | null } | null {
    try { const saved = JSON.parse(localStorage.getItem(ACTIVE_SCAN_KEY) || localStorage.getItem("resync_active_scan") || "null"); if (saved?.id && typeof saved.at === "number" && Date.now() - saved.at < 3 * 60 * 60 * 1000) return saved; localStorage.removeItem(ACTIVE_SCAN_KEY); localStorage.removeItem("resync_active_scan"); return null; } catch { return null; }
  }

  function handleScanStart(words: number | null) {
    setScanOutcome(null); setScanWords(words); scanWordsRef.current = words; setScanStartedAt(Date.now());
    setScanRunning(true);
    setScanSending(true);
    if (notificationPrefsRef.current.alerts) void askForDesktopAlerts();   // this runs inside the click that started the scan
    scanRunRef.current += 1;
    scanSettledRef.current = false;
    setScanResult(null);  // a rescan starts clean: the previous report and its recommendations are dropped
   
    setToast(null);
    unlockAudio();
  }

  useEffect(() => {
    if (screen !== 'results' || isSampleMode || !activeScanId || !session || scanResult?.analysis_run_id === activeScanId) return;
    let cancelled = false;
    setResultError('');
    getScanResult(activeScanId).then(result => {
      if (!cancelled) { setScanResult(result); }
    }).catch(error => {
      if (!cancelled) setResultError(error instanceof Error ? error.message : 'Unable to load this report.');
    });
    return () => { cancelled = true; };
  }, [screen, isSampleMode, activeScanId, session, scanResult?.analysis_run_id]);

  function handleScanCompleted(result?: { analysis_run_id?: string; rescan_unchanged?: boolean; manuscript_title?: string | null }) {
    if (scanSettledRef.current) return;
    scanSettledRef.current = true;
    setScanRunning(false);
    clearActiveScan();
    const wantsSound = notificationPrefsRef.current.alerts && notificationPrefsRef.current.sound;
    const played = wantsSound ? playCompletionChime() : true;   // no sound wanted: nothing to be blocked
    setSoundBlocked(!played);
    const finishedId = result?.analysis_run_id;
    const docName = (result?.manuscript_title ?? '').trim();   // the report is named after the uploaded document
    const scanOf = docName ? `Your scan of "${docName}"` : 'Your manuscript scan';
    if (notificationPrefsRef.current.alerts) showDesktopAlert(result?.rescan_unchanged ? "No changes detected" : "Scan successful", result?.rescan_unchanged ? `${scanOf} is the same as your last scan.` : `${scanOf} is successful. Click to view your report.`, () => { if (finishedId) navigate("results", false, finishedId); });
    if (result?.rescan_unchanged) pushNotification("success", "No changes detected", "Your manuscript is the same as your last scan, so the report is unchanged.", result.analysis_run_id);
    else pushNotification("success", "Scan complete", `${scanOf} is successful. Your report is ready.`, result?.analysis_run_id);
  }

  function handleScanFailed(error: unknown, recovered = false) {
    if (scanSettledRef.current) return;
    scanSettledRef.current = true;
    setScanRunning(false);
    setSoundBlocked(false);
    const outcome = error instanceof ScanOutcome ? error : new ScanOutcome('We could not start this scan. Please try again.', '', 'failed');
    setScanOutcome(outcome);
    if (recovered && outcome.kind === 'info') navigate('processing');
    if (outcome.kind === 'info' && outcome.message === 'We cannot confirm this scan. Open your dashboard later or start it again.') clearActiveScan();
    if (outcome.kind === 'failed') {
      if (recovered) { setDashboardNotice(outcome.message); navigate('dashboard'); }
      const userId = sessionRef.current?.user.id;
      const notInBell = !outcome.scanId || shouldNotifyFailure(notificationsRef.current, outcome.scanId);
      let notInLedger = true;
      if (outcome.scanId && userId) {
        try { notInLedger = rememberFailureNotification(localStorage, userId, outcome.scanId, Date.now()); } catch { /* storage unavailable */ }
      }
      if (notInBell && notInLedger) {
        if (notificationPrefsRef.current.alerts) showDesktopAlert("Your ReSync scan did not finish", outcome.message);
        pushNotification("error", "Scan did not finish", outcome.message, outcome.scanId || undefined);
      }
      clearActiveScan();
    }
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
    await signOutRef.current?.run(false);
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
        onEnableSound={enableSound}
        onClose={() => setToast(null)}
      />
      {screen === "home" && <HomeScreen onNavigate={navigate} session={session} />}
      {(screen === "upload" || scanRunning && scanSending) && <div hidden={screen !== "upload"}><UploadScreen onNavigate={navigate} onBack={goBack} session={session} onScanStart={handleScanStart} onScanFailed={handleScanFailed} onScanStarted={id => { setScanSending(false); rememberActiveScan(id); }} onScanRejected={() => { setScanSending(false); setScanRunning(false); scanSettledRef.current = true; navigate("upload"); }} onScanComplete={result => { setScanResult(result); handleScanCompleted(result); if (['processing', 'upload'].includes(screenRef.current)) navigate("results", false, result.analysis_run_id); }} /></div>}
      {screen === "processing" && <ProcessingScreen onNavigate={navigate} outcome={scanOutcome} startedAt={scanStartedAt} words={scanWords} sending={scanSending} />}
      {screen === "results" && (isSampleMode || (scanResult?.result_version === 'v7' && scanResult.analysis_run_id === activeScanId)
        ? <ResultsScreen onNavigate={navigate} onBack={goBack} scan={scanResult as V7ScanResponse} isSample={isSampleMode} onScanUpdated={setScanResult} />
        : <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p>{resultError || (activeScanId && scanResult?.analysis_run_id !== activeScanId ? 'Loading report…' : scanResult ? 'This scan was made with an older version of ReSync. Please run a new scan.' : 'No scan result is available. Please run a new scan.')}</p>
            <button type="button" onClick={() => navigate('upload')} className="rounded-lg bg-indigo-600 px-5 py-2 text-white">New scan</button>
          </div>)}
      {screen === "login" && sessionEndedNotice && <div role="alert" className="bg-blue-50 p-4 text-center text-blue-900">Your session has ended. Please sign in again.</div>}
      {screen === "login" && <LoginScreen onNavigate={navigate} onBack={goBack} onLoginSuccess={handleLoginSuccess} />}
      {screen === "signup" && <SignupScreen onNavigate={navigate} onBack={goBack} onSignupSuccess={() => navigate("dashboard")} />}
      {screen === "reset-password" && <ResetPasswordScreen onNavigate={navigate} onBack={goBack} />}
      {screen === "dashboard" && dashboardNotice && <div role="status" className="p-4 text-center bg-blue-50 text-blue-900">{dashboardNotice} <button type="button" onClick={() => setDashboardNotice(null)} aria-label="Dismiss notice" className="rounded-sm underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900">Dismiss</button></div>}
      {screen === "dashboard" && <DashboardScreen scanRunning={scanRunning} onViewProgress={() => navigate("processing")} onNavigate={navigate} session={session} onLogout={handleLogout} notifications={notifications} onMarkNotificationsRead={markNotificationsRead} notificationPrefs={notificationPrefs} onNotificationPrefsChange={prefs => { setNotificationPrefs(prefs); saveNotificationPrefs(prefs); }} onOpenReport={scanId => { const id = scanId ?? scanResult?.analysis_run_id; if (id) navigate("results", false, id); }} />}
    </div>
  );
}



