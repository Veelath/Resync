import { useState, useEffect, useRef } from "react";
import type { Screen, DisplayScan } from './lib/appTypes';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SignupScreen } from './screens/SignupScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ProcessingScreen } from './screens/ProcessingScreen';
import { UploadScreen } from './screens/UploadScreen';
import { DashboardScreen } from './screens/dashboard/DashboardScreen';
import { ResultsScreen } from './screens/results/ResultsScreen';
import { ToastBanner, loadNotifications, playCompletionChime, unlockAudio, NOTIFICATIONS_KEY, type AppNotification } from './components/ScanNotifications';

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const screenRef = useRef<Screen>("home");
  const historyIndex = useRef(0);
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [scanResult, setScanResult] = useState<DisplayScan | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>(loadNotifications);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanRunRef = useRef(0);
  const scanSettledRef = useRef(true);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  const RESTORABLE_SCREENS: Screen[] = ['dashboard', 'upload'];

  useEffect(() => {
    const savedScreen = sessionStorage.getItem('resync_screen') as Screen | null;
    const isRecovery = window.location.pathname === '/reset-password' || window.location.hash.includes('type=recovery');

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      sessionRef.current = session;
      let initialScreen: Screen = 'home';
      if (isRecovery) {
        initialScreen = 'reset-password';
      } else if (session && savedScreen && RESTORABLE_SCREENS.includes(savedScreen)) {
        initialScreen = savedScreen;
      } else if (session) {
        initialScreen = 'dashboard';
      }
      screenRef.current = initialScreen;
      setScreen(initialScreen);
      window.history.replaceState({ resync: { index: 0, screen: initialScreen, sample: false } }, '');
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      sessionRef.current = session;
      if (event === 'PASSWORD_RECOVERY') {
        screenRef.current = 'reset-password';
        setScreen("reset-password");
        window.history.replaceState({ resync: { index: historyIndex.current, screen: 'home', sample: false } }, '');
      } else if (event === 'SIGNED_IN' && session) {
        setScreen(prev => {
          if (['login', 'signup', 'home'].includes(prev)) {
            sessionStorage.setItem('resync_screen', 'dashboard');
            screenRef.current = 'dashboard';
            window.history.replaceState({ resync: { index: historyIndex.current, screen: 'dashboard', sample: false } }, '');
            return "dashboard";
          }
          return prev;
        });
      } else if (!session) {
        setScreen(prev => {
          if (['dashboard', 'upload', 'processing', 'results'].includes(prev)) {
            sessionStorage.setItem('resync_screen', 'home');
            screenRef.current = 'home';
            window.history.replaceState({ resync: { index: historyIndex.current, screen: 'home', sample: false } }, '');
            return "home";
          }
          return prev;
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const destination = event.state?.resync as { index: number; screen: Screen; sample: boolean } | undefined;
      historyIndex.current = destination?.index ?? 0;
      const target = destination?.screen ?? 'home';
      let next: Screen = !sessionRef.current && !destination?.sample && ['dashboard', 'upload', 'results'].includes(target) ? 'home' : target;
      // A signed-in user pressing Back must stay signed in: skip the sign-in / sign-up pages.
      if (sessionRef.current && (next === 'login' || next === 'signup' || (next === 'home' && !destination?.sample))) next = 'dashboard';
      screenRef.current = next;
      setScreen(next);
      setIsSampleMode(destination?.sample ?? false);
      sessionStorage.setItem('resync_screen', next);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(s: Screen, asSample = false) {
    const target = s === 'dashboard' && !sessionRef.current ? 'login'
      : sessionRef.current && (s === 'login' || s === 'signup' || (s === 'home' && !asSample)) ? 'dashboard'
      : s;
    const transient = ['processing', 'login', 'signup', 'reset-password'];
    const previous = window.history.state?.resync?.screen as Screen | undefined;
    const replacingTransient = transient.includes(screenRef.current) && !transient.includes(target);
    const entry = { index: historyIndex.current + (replacingTransient ? 0 : 1), screen: transient.includes(target) ? previous ?? 'home' : target, sample: asSample };
    if (replacingTransient) window.history.replaceState({ resync: entry }, '');
    else window.history.pushState({ resync: entry }, '');
    historyIndex.current = entry.index;
    screenRef.current = target;
    setIsSampleMode(asSample);
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
      window.history.replaceState({ resync: { index: 0, screen: fallback, sample: false } }, '');
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
    setToast(null);
    unlockAudio();
  }

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
    setIsSampleMode(false);
    screenRef.current = 'dashboard';
    setScreen("dashboard");
    window.history.replaceState({ resync: { index: historyIndex.current, screen: 'dashboard', sample: false } }, '');
    sessionStorage.setItem('resync_screen', 'dashboard');
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    sessionStorage.setItem('resync_screen', 'home');
    screenRef.current = 'home';
    setScreen('home');
    window.history.replaceState({ resync: { index: historyIndex.current, screen: 'home', sample: false } }, '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      {screen === "upload" && <UploadScreen onNavigate={navigate} onBack={goBack} session={session} onScanStart={handleScanStart} onScanFailed={handleScanFailed} onScanComplete={(result) => { setScanResult(result); handleScanCompleted(); navigate("results"); }} />}
      {screen === "processing" && <ProcessingScreen onNavigate={navigate} />}
      {screen === "results" && <ResultsScreen onNavigate={navigate} onBack={goBack} scan={scanResult} isSample={isSampleMode} />}
      {screen === "login" && <LoginScreen onNavigate={navigate} onBack={goBack} onLoginSuccess={handleLoginSuccess} />}
      {screen === "signup" && <SignupScreen onNavigate={navigate} onBack={goBack} onSignupSuccess={() => navigate("dashboard")} />}
      {screen === "reset-password" && <ResetPasswordScreen onNavigate={navigate} onBack={goBack} />}
      {screen === "dashboard" && <DashboardScreen onNavigate={navigate} session={session} onLogout={handleLogout} notifications={notifications} onMarkNotificationsRead={markNotificationsRead} onOpenReport={() => scanResult && navigate("results")} />}
    </div>
  );
}



