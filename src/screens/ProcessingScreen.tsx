import { useEffect, useState, useSyncExternalStore } from 'react';
import { Logo } from '../components/AppPrimitives';
import type { Screen } from '../lib/appTypes';
import { getScanStatus, subscribeScanStatus } from '../services/api';
import { failureTitle, isLongRunning, queueText } from '../lib/scanWait';
import './processing-screen.css';

const steps = ['Reading your manuscript', 'Checking section flow and links', 'Verifying citation access', 'Checking the AI-text indicator'];

export function ProcessingScreen({ onNavigate, outcome, startedAt, words }: { onNavigate: (s: Screen) => void; outcome: { message: string; kind: string; failureKind?: string } | null; startedAt: number; words: number | null }) {
  const status = useSyncExternalStore(subscribeScanStatus, getScanStatus);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const queued = status?.queuePosition != null;
  const long = !queued && isLongRunning(now - startedAt, words, status?.elapsedSeconds);
  const stage = steps[Math.min(steps.length - 1, Math.floor(Math.max(0, now - startedAt) / 30000))];
  const info = outcome?.kind === 'info' ? outcome.message : status?.info;
  return <main className="processing-screen">
    <style>{`.scan-wait-pulse{animation:scan-wait-pulse 2s ease-in-out infinite}@keyframes scan-wait-pulse{50%{opacity:.35}}@media(prefers-reduced-motion:reduce){.scan-wait-pulse{animation:none}}`}</style>
    <div className="processing-screen__texture" aria-hidden="true" /><div className="processing-screen__glow" aria-hidden="true" />
    <div className="processing-screen__content">
      <div className="processing-screen__logo"><Logo className="processing-screen__logo-image" /></div>
      {outcome?.kind === 'failed' ? <section className="processing-screen__card" role="alert"><h1>{failureTitle(outcome.failureKind)}</h1><p>{outcome.message}</p><button type="button" className="processing-screen__leave" style={{background: "#1a1fcc", color: "white"}} onClick={() => onNavigate('upload')}>Start again</button></section> : <>
        <h1>{queued ? 'Waiting in line' : 'Analyzing your manuscript'}</h1>
        {queued && <p>{queueText(status!.queuePosition!, status!.estimatedWaitSeconds)}</p>}
        {status?.message && <p>{status.message}</p>}
        {status?.reconnecting && <p role="status">Trying to reconnect to the server...</p>}
        {info && <section className="processing-screen__card" role="status"><p>{info}</p>{outcome && <button type="button" className="processing-screen__leave" style={{background: "#1a1fcc", color: "white"}} onClick={() => onNavigate('upload')}>Start again</button>}</section>}
        {!outcome && !queued && <section className="processing-screen__card" aria-label="Scan progress"><div role="progressbar" aria-label="Manuscript analysis in progress" className="processing-screen__progress-track"><div className="processing-screen__progress-fill scan-wait-pulse" style={{width:'100%'}} /></div><p aria-live="polite">{stage}</p></section>}
        {long && !outcome && <p>This is taking longer than usual. Your scan is still running. You can leave this page; we will tell you when your report is ready.</p>}
        <button type="button" className="processing-screen__leave" onClick={() => onNavigate('dashboard')}>Continue in background</button>
      </>}
    </div>
  </main>;
}
