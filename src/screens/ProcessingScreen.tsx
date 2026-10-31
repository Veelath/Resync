import { useEffect, useState, useSyncExternalStore } from 'react';
import { Logo } from '../components/AppPrimitives';
import { LottieLoader } from '../components/LottieLoader';
import type { Screen } from '../lib/appTypes';
import { getScanStatus, subscribeScanStatus } from '../services/api';
import './processing-screen.css';

const steps = [
  { label: 'Reading your manuscript', detail: 'Extracting chapters, sections and references', dur: 1500 },
  { label: 'Checking section flow and links', detail: 'Comparing sections across your whole manuscript', dur: 2500 },
  { label: 'Verifying citation access', detail: 'Checking which sources are public or private', dur: 3000 },
  { label: 'Checking the AI-text indicator', detail: 'Reviewing the advisory indicator by section', dur: 2000 },
];
const finalStep = { label: 'Generating AI Recommendations', detail: 'The AI is reviewing each pair of sections. This can take a little longer.' };
const waitingStep = { label: 'Waiting in line', detail: 'Your scan will start as soon as the current scan is complete.' };

export function ProcessingScreen({ onNavigate: _onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [done, setDone] = useState(0);
  const status = useSyncExternalStore(subscribeScanStatus, getScanStatus);
  const isQueued = status?.queued === true;
  const [dismissedNotice, setDismissedNotice] = useState<string | null>(null);
  const noticeKey = status ? `${status.level}:${status.message}` : null;
  const notice = status && noticeKey !== dismissedNotice ? status : null;
  useEffect(() => {
    if (isQueued) return;
    const startingDone = done;
    let elapsed = 0;
    const timers = steps.slice(startingDone).map((step, index) => {
      elapsed += step.dur;
      return setTimeout(() => setDone(startingDone + index + 1), elapsed);
    });
    return () => timers.forEach(clearTimeout);
  }, [isQueued]);

  // The display clock is unchanged; the scan request and polling remain in UploadScreen.
  const pct = isQueued ? 0 : done >= steps.length ? 99 : Math.min(99, Math.round((done / steps.length) * 100));
  // From 90% on the checks are finished and the slow part, the AI review, is running, so say so instead of sitting at 99%.
  const active = isQueued ? waitingStep : pct >= 90 ? finalStep : steps[done] ?? finalStep;

  return (
    <main className="processing-screen">
      <div className="processing-screen__texture" aria-hidden="true" />
      <div className="processing-screen__glow" aria-hidden="true" />
      <div className="processing-screen__content">
        <div className="processing-screen__hero">
          <LottieLoader className="processing-screen__orbit" />
          <div className="processing-screen__logo"><Logo className="processing-screen__logo-image" /></div>
          <span className="processing-screen__chip processing-screen__chip--links"><i />Section links</span>
          <span className="processing-screen__chip processing-screen__chip--citations"><i />Citations</span>
          <span className="processing-screen__chip processing-screen__chip--suggestions"><i />AI explanations</span>
        </div>

        <h1>Analyzing your manuscript</h1>
        <p className="processing-screen__subtitle">Running {steps.length} checks as a holistic manuscript analysis</p>

        <div aria-live="polite">
          {notice && (
            <div className={`processing-screen__notice processing-screen__notice--${notice.level}`}>
              {notice.level === 'wait' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 2h12M6 22h12M7 2c0 5 5 6 5 10s-5 5-5 10M17 2c0 5-5 6-5 10s5 5 5 10" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
              )}
              <p>{notice.message}</p>
              <button type="button" className="processing-screen__notice-dismiss" aria-label="Dismiss notification" onClick={() => setDismissedNotice(noticeKey)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          )}
        </div>

        <section className="processing-screen__card" aria-label="Scan progress">
          <div className="processing-screen__progress-heading">
            <span className="processing-screen__progress-label"><i aria-hidden="true" />{active.label}…</span>
            <span className="processing-screen__percent">{pct}%</span>
          </div>
          <div className="processing-screen__progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Manuscript analysis progress">
            <div className="processing-screen__progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className={`processing-screen__active-step${isQueued ? ' processing-screen__active-step--queued' : ''}`} aria-current="step" aria-live="polite">
            <div className="processing-screen__step-copy"><strong>{active.label}</strong><span>{active.detail}</span></div>
            <span className="processing-screen__spinner" aria-hidden="true" />
          </div>
        </section>

        <p className="processing-screen__keep-open">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          This can take a moment. Please do not close this tab.
        </p>
      </div>
    </main>
  );
}
