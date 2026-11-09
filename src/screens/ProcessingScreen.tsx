import { useEffect, useState, useSyncExternalStore } from 'react';
import { Logo } from '../components/AppPrimitives';
import { LottieLoader } from '../components/LottieLoader';
import { askForDesktopAlerts, desktopAlertsState } from '../components/ScanNotifications';
import type { Screen } from '../lib/appTypes';
import { getScanStatus, subscribeScanStatus } from '../services/api';
import { failureTitle } from '../lib/scanWait';
import './processing-screen.css';

const steps = [
  { label: 'Reading your manuscript', detail: 'Extracting chapters, sections and references' },
  { label: 'Checking section flow and links', detail: 'Comparing sections across your whole manuscript' },
  { label: 'Verifying citation access', detail: 'Checking which sources are public or private' },
  { label: 'Checking the AI-text indicator', detail: 'Reviewing the advisory indicator by section' },
];

export function ProcessingScreen({ onNavigate, outcome, startedAt, words, sending }: { onNavigate: (s: Screen) => void; outcome: { message: string; kind: string; failureKind?: string } | null; startedAt: number; words: number | null; sending: boolean }) {
  const status = useSyncExternalStore(subscribeScanStatus, getScanStatus);
  const [alerts, setAlerts] = useState(desktopAlertsState);
  const queued = !sending && status?.queuePosition != null;
  const active = sending ? { label: 'Sending your manuscript', detail: 'Please keep this page open while your manuscript is sent.' } : queued ? { label: 'Getting ready', detail: 'Your scan will start in a moment.' } : { label: 'Your scan is in progress', detail: 'We will let you know when your report is ready.' };
  const info = sending ? null : outcome?.kind === 'info' ? outcome.message : status?.info;

  return <main className="processing-screen">
    <div className="processing-screen__texture" aria-hidden="true" /><div className="processing-screen__glow" aria-hidden="true" />
    <div className="processing-screen__content">
      <div className="processing-screen__hero">
        {!sending && <LottieLoader className="processing-screen__orbit" />}
        <div className="processing-screen__logo"><Logo className="processing-screen__logo-image" /></div>
        <span className="processing-screen__chip processing-screen__chip--links"><i />Section links</span>
        <span className="processing-screen__chip processing-screen__chip--citations"><i />Citations</span>
        <span className="processing-screen__chip processing-screen__chip--suggestions"><i />AI explanations</span>
      </div>
      {outcome?.kind === 'failed' ? <section className="processing-screen__card" role="alert"><h1>{failureTitle(outcome.failureKind)}</h1><p>{outcome.message}</p><button type="button" className="processing-screen__leave" style={{background: '#1a1fcc', color: 'white'}} onClick={() => onNavigate('upload')}>Start again</button></section> : <>
        <h1>{sending ? 'Sending your manuscript' : 'Analyzing your manuscript'}</h1>
        {!sending && <p className="processing-screen__subtitle">Running {steps.length} checks as a holistic manuscript analysis</p>}
        {!sending && status?.reconnecting && <div className="processing-screen__notice" role="status"><p>Trying to reconnect to the server...</p></div>}
        {info && <section className="processing-screen__card" role="status"><p>{info}</p>{outcome && <button type="button" className="processing-screen__leave" style={{background: '#1a1fcc', color: 'white'}} onClick={() => onNavigate('upload')}>Start again</button>}</section>}
        {!outcome && <section className="processing-screen__card" aria-label="Scan progress">
          <div className="processing-screen__progress-heading"><span className="processing-screen__progress-label"><i aria-hidden="true" />{active.label}…</span><span className="processing-screen__percent" aria-hidden="true" /></div>
          <div className="processing-screen__progress-track" role="progressbar" aria-busy="true" aria-label="Manuscript analysis progress"><div className="processing-screen__progress-fill" /></div>
          <div className={`processing-screen__active-step${queued ? ' processing-screen__active-step--queued' : ''}`} aria-current="step" aria-live="polite"><div className="processing-screen__step-copy"><strong>{active.label}</strong><span>{active.detail}</span></div><span className="processing-screen__spinner" aria-hidden="true" /></div>
        </section>}
        {!sending && <><p className="processing-screen__keep-open"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>You can leave this page; we will tell you when your report is ready.</p>
        <button type="button" className="processing-screen__leave" onClick={() => onNavigate('dashboard')}>Continue in background</button>
        {alerts === 'default' && <button type="button" className="processing-screen__link" onClick={() => { void askForDesktopAlerts().then(setAlerts); }}>Turn on computer notifications, so you hear about it even in another app</button>}
        {alerts === 'denied' && <p className="processing-screen__keep-open" style={{ marginTop: 10 }}>Computer notifications are blocked for this site. Allow them in your browser's site settings to get alerts while you use other apps.</p>}</>}
      </>}
    </div>
  </main>;
}
