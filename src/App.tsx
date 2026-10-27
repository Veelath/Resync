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

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const screenRef = useRef<Screen>("home");
  const historyIndex = useRef(0);
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [scanResult, setScanResult] = useState<DisplayScan | null>(null);
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
      const next = !sessionRef.current && !destination?.sample && ['dashboard', 'upload', 'results'].includes(target) ? 'home' : target;
      screenRef.current = next;
      setScreen(next);
      setIsSampleMode(destination?.sample ?? false);
      sessionStorage.setItem('resync_screen', next);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(s: Screen, asSample = false) {
    const target = s === 'dashboard' && !sessionRef.current ? 'login' : s;
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
      screenRef.current = 'home';
      setScreen('home');
      setIsSampleMode(false);
      sessionStorage.setItem('resync_screen', 'home');
      window.history.replaceState({ resync: { index: 0, screen: 'home', sample: false } }, '');
    }
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
      {screen === "home" && <HomeScreen onNavigate={navigate} />}
      {screen === "upload" && <UploadScreen onNavigate={navigate} onBack={goBack} session={session} onScanComplete={(result) => { setScanResult(result); navigate("results"); }} />}
      {screen === "processing" && <ProcessingScreen onNavigate={navigate} />}
      {screen === "results" && <ResultsScreen onNavigate={navigate} scan={scanResult} isSample={isSampleMode} />}
      {screen === "login" && <LoginScreen onNavigate={navigate} onBack={goBack} onLoginSuccess={handleLoginSuccess} />}
      {screen === "signup" && <SignupScreen onNavigate={navigate} onBack={goBack} onSignupSuccess={() => navigate("dashboard")} />}
      {screen === "reset-password" && <ResetPasswordScreen onNavigate={navigate} onBack={goBack} />}
      {screen === "dashboard" && <DashboardScreen onNavigate={navigate} session={session} onLogout={handleLogout} />}
    </div>
  );
}



