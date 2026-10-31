import { useEffect, useLayoutEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import './dashboard/onboarding-tour.css';
import './upload-tour.css';

const STORAGE_KEY = 'resync-upload-tour-done';

export function uploadTourSeen() {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

const stops: { step: 1 | 2; target: string; title: string; text: string }[] = [
  { step: 1, target: 'progress', title: 'Two quick steps', text: 'Pick your chapter headings first (optional), then upload your manuscript. ReSync runs the scan after that.' },
  { step: 1, target: 'template', title: 'Optional chapter template', text: 'Have a school template? Attach it so ReSync uses your exact headings. Skip it and ReSync detects the sections for you.' },
  { step: 2, target: 'source', title: 'Add your manuscript', text: 'Drop a Word file (.doc/.docx, up to 25 MB) or paste a Google Docs link set to “Anyone with the link can view”.' },
  { step: 2, target: 'run', title: 'Run the scan', text: 'One credit checks how every chapter connects. When it finishes, your report opens with the findings.' },
];

interface Box { top: number; left: number; width: number; height: number }

/** Spotlight walkthrough of the upload page. It moves between the two upload steps itself and is remembered per browser. */
export function UploadTour({ open, onStepChange, onClose }: { open: boolean; onStepChange: (step: 1 | 2) => void; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const stop = stops[index];

  const close = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* storage blocked: the tour shows again next time */ }
    setIndex(0);
    onClose();
  };

  useEffect(() => { if (open) onStepChange(stop.step); }, [open, index]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!open) return;
    let frame = 0;
    const measure = () => {
      const element = document.querySelector<HTMLElement>(`[data-tour="${stop.target}"]`);
      if (!element) { setBox(null); return; }
      const rect = element.getBoundingClientRect();
      setBox({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    // the page may be switching steps: wait a beat, bring the target into view, then measure
    const timer = window.setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-tour="${stop.target}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      schedule();
    }, 80);
    const settle = window.setTimeout(schedule, 600);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.clearTimeout(settle);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, index]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  const last = index === stops.length - 1;
  const pad = 10;
  const viewportH = window.innerHeight;
  const below = box ? box.top + box.height + 24 + 230 < viewportH : true;
  const cardStyle = box ? {
    left: Math.max(16, Math.min(box.left, window.innerWidth - 376)),
    top: below ? box.top + box.height + pad + 14 : undefined,
    bottom: below ? undefined : viewportH - box.top + pad + 14,
  } : { left: 16, top: 96 };

  return <div className="ut-layer" role="dialog" aria-modal="true" aria-label="Upload tour">
    {box ? <span className="ut-spot" style={{ top: box.top - pad, left: box.left - pad, width: box.width + pad * 2, height: box.height + pad * 2 }} aria-hidden="true" /> : <span className="ut-dim" aria-hidden="true" />}
    <div key={index} className="ut-card" style={cardStyle}>
      <span className="tour-mono tour-accent">Step {index + 1} of {stops.length}</span>
      <h3>{stop.title}</h3>
      <p>{stop.text}</p>
      <div className="tour-dots" aria-hidden="true">{stops.map((_, i) => <span key={i} className={i === index ? 'on' : ''} />)}</div>
      <div className="tour-actions">
        {last ? <span className="tour-replay-hint">Replay anytime.</span> : <button type="button" className="tour-skip ut-small" onClick={close}>Skip tour</button>}
        <div className="tour-buttons">
          {index > 0 && <button type="button" className="tour-back ut-small" onClick={() => setIndex(index - 1)}>Back</button>}
          <button type="button" className="tour-next ut-small" autoFocus onClick={() => last ? close() : setIndex(index + 1)}>{last ? 'Got it' : 'Next'}<ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  </div>;
}
