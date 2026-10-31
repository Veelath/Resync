import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, TriangleAlert, Upload } from 'lucide-react';
import './onboarding-tour.css';

const STORAGE_KEY = 'resync-tour-done';
const TOTAL = 4;

export function tourSeen() {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

function markSeen() {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* storage blocked: the tour simply shows again next time */ }
}

const sections = ['Introduction', 'Related Literature', 'Methodology', 'Results'];

function StepOneArt() {
  return <div className="tour-card tour-float">
    <span className="tour-mono tour-accent">Your manuscript</span>
    <div className="tour-list">
      {sections.map((name, index) => <div key={name} className="tour-row"><span className="tour-mono">{String(index + 1).padStart(2, '0')}</span>{name}</div>)}
    </div>
    <p className="tour-note">Reads .docx and .doc files</p>
  </div>;
}

function StepTwoArt() {
  return <div className="tour-upload">
    <div className="tour-card">
      <div className="tour-drop">
        <span className="tour-drop-icon"><Upload size={22} aria-hidden="true" /></span>
        <strong>Drop your thesis here</strong>
        <span className="tour-mono">.doc, .docx or Google Docs link</span>
        <span className="tour-fake-button">Browse file</span>
      </div>
    </div>
    <div className="tour-detected tour-float">
      <span className="tour-mono"><Check size={13} strokeWidth={3} aria-hidden="true" />Detected sections</span>
      <div className="tour-chips">{['Introduction', 'RRL', 'Methodology', 'Results'].map(name => <span key={name}>{name}</span>)}</div>
    </div>
  </div>;
}

function StepThreeArt() {
  return <div className="tour-compare">
    <div className="tour-card tour-compare-card">
      <div className="tour-quote"><span className="tour-mono tour-accent">Chapter 1 — Objectives</span><span>The study will <mark>measure engagement using biometric data</mark> collected over one semester.</span></div>
      <div className="tour-link" aria-hidden="true"><svg className="tour-spin" width="28" height="28" viewBox="0 0 30 30" fill="none"><circle cx="15" cy="15" r="12" stroke="#7B76F0" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" /></svg></div>
      <div className="tour-quote"><span className="tour-mono tour-accent">Chapter 2 — Methodology</span><span>Data were collected using the <strong>Maslach Burnout Inventory</strong> and the AWS survey instrument only.</span></div>
    </div>
    <div className="tour-alert tour-float"><span><TriangleAlert size={16} aria-hidden="true" /></span><div><strong>Not aligned</strong><small>Objective and method differ</small></div></div>
  </div>;
}

function StepFourArt() {
  return <div className="tour-card tour-float tour-report">
    <div className="tour-report-head">
      <div className="tour-ring"><svg width="70" height="70" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="#E3F7EE" strokeWidth="7" /><circle className="tour-ring-arc" cx="32" cy="32" r="26" fill="none" stroke="#12805C" strokeWidth="7" strokeLinecap="round" strokeDasharray="163.4" strokeDashoffset="26.1" /></svg><b>84</b></div>
      <div><strong>Predictors of Academic Burnout</strong><span className="tour-good">Strong Coherence</span></div>
    </div>
    <span className="tour-mono">Revision plan</span>
    <div className="tour-todo tour-todo-done"><i><Check size={11} strokeWidth={3.4} aria-hidden="true" /></i>Align data collection with Methodology</div>
    <div className="tour-todo"><i />Reconcile sample size in Chapter 4</div>
  </div>;
}

const steps: { title: string; text: string; art: ReactNode }[] = [
  { title: 'Upload your manuscript', text: 'Upload your thesis or capstone paper. ReSync reads every chapter and checks that they stay consistent with each other.', art: <StepOneArt /> },
  { title: 'Upload your manuscript', text: 'Add a Word file (.doc/.docx) or paste a Google Docs link. ReSync identifies your sections and checks how each connects to the next.', art: <StepTwoArt /> },
  { title: 'ReSync scans the connections', text: 'Consecutive sections are compared to find weak logical links or conflicting information. Citations and the AI-text indicator are reviewed too.', art: <StepThreeArt /> },
  { title: 'Review your report', text: 'See highlighted passages, explanations, and suggested revisions in one report. Use the findings as guidance and check them with your adviser.', art: <StepFourArt /> },
];

/** First-visit quick tour: four steps in a popup. Closing it (skip or finish) is remembered in this browser. */
export function OnboardingTour({ name, open, onClose }: { name: string; open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = () => { markSeen(); setStep(1); onClose(); };

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  const current = steps[step - 1];
  const last = step === TOTAL;
  return <div className="tour-overlay">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Quick tour" tabIndex={-1} className="tour-dialog">
      <div key={`art-${step}`} className="tour-art"><span className="tour-blob tour-blob-a" aria-hidden="true" /><span className="tour-blob tour-blob-b" aria-hidden="true" />{current.art}</div>
      <div key={`copy-${step}`} className="tour-copy">
        <span className="tour-mono tour-accent tour-eyebrow">{step === 1 ? `Welcome, ${name} · ` : ''}Step {step} of {TOTAL}</span>
        <h2>{current.title}</h2>
        <p>{current.text}</p>
        <div className="tour-spacer" />
        <div className="tour-dots" aria-hidden="true">{steps.map((_, index) => <span key={index} className={index + 1 === step ? 'on' : ''} />)}</div>
        <div className="tour-actions">
          {last ? <span className="tour-replay-hint">You can replay this tour anytime.</span> : <button type="button" className="tour-skip" onClick={close}>Skip tour</button>}
          <div className="tour-buttons">
            {step > 1 && <button type="button" className="tour-back" onClick={() => setStep(step - 1)}>Back</button>}
            <button type="button" className="tour-next" onClick={() => last ? close() : setStep(step + 1)}>{last ? 'Get started' : 'Next'}<ArrowRight size={17} aria-hidden="true" /></button>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
