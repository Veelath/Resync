import { useEffect, useState } from 'react';
import { Logo } from '../components/AppPrimitives';
import type { Screen } from '../lib/appTypes';
import './processing-screen.css';

const steps = [
  { label: 'Reading your manuscript', detail: 'Extracting chapters, sections and references', dur: 1500 },
  { label: 'Checking section flow and links', detail: 'Comparing consecutive sections', dur: 2500 },
  { label: 'Verifying citation access', detail: 'Checking which sources are public or private', dur: 3000 },
  { label: 'Checking the AI-text indicator', detail: 'Reviewing the advisory indicator by section', dur: 2000 },
];
const finalStep = { label: 'Finalizing your report', detail: 'Preparing findings and AI explanations' };

export function ProcessingScreen({ onNavigate: _onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    let elapsed = 0;
    const timers = steps.map((step, index) => {
      elapsed += step.dur;
      return setTimeout(() => setDone(index + 1), elapsed);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // The display clock is unchanged; the scan request and polling remain in UploadScreen.
  const pct = done >= steps.length ? 99 : Math.min(99, Math.round((done / steps.length) * 100));
  const active = steps[done] ?? finalStep;

  return (
    <main className="processing-screen">
      <div className="processing-screen__texture" aria-hidden="true" />
      <div className="processing-screen__glow" aria-hidden="true" />
      <div className="processing-screen__content">
        <div className="processing-screen__hero">
          <div className="processing-screen__orbit" aria-hidden="true">
            <svg viewBox="0 0 300 300" focusable="false">
              <circle className="processing-screen__orbit-track" cx="150" cy="150" r="144" />
              <circle className="processing-screen__orbit-arc" cx="150" cy="150" r="114" />
              <circle className="processing-screen__orbit-dot" cx="150" cy="6" r="7" />
            </svg>
          </div>
          <div className="processing-screen__logo"><Logo className="processing-screen__logo-image" /></div>
          <span className="processing-screen__chip processing-screen__chip--links"><i />Section links</span>
          <span className="processing-screen__chip processing-screen__chip--citations"><i />Citations</span>
          <span className="processing-screen__chip processing-screen__chip--suggestions"><i />AI explanations</span>
        </div>

        <h1>Analyzing your manuscript</h1>
        <p className="processing-screen__subtitle">Running {steps.length} checks across consecutive sections</p>

        <section className="processing-screen__card" aria-label="Scan progress">
          <div className="processing-screen__progress-heading">
            <span className="processing-screen__progress-label"><i aria-hidden="true" />{active.label}…</span>
            <span className="processing-screen__percent">{pct}%</span>
          </div>
          <div className="processing-screen__progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Manuscript analysis progress">
            <div className="processing-screen__progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="processing-screen__active-step" aria-current="step" aria-live="polite">
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
