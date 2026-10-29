import { ArrowRight, Download, FileText, Link2, MessageSquare, PanelsTopLeft, ScanSearch, Sparkles, Upload } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import type { Screen } from '../../lib/appTypes';
import './dashboard-design.css';

const steps = [
  { number: '01', label: 'Upload Manuscript', description: 'Upload your Word file or paste a Google Docs share link.', icon: Upload },
  { number: '02', label: 'Set Type & Template', description: 'Choose your manuscript type and optionally attach a chapter template.', icon: PanelsTopLeft },
  { number: '03', label: 'Coherence Scan', description: 'AI checks section links, citations, and the AI-text indicator.', icon: ScanSearch },
  { number: '04', label: 'Export Report', description: 'Download your annotated report and fix recommendations as a PDF.', icon: Download },
];

export function DashboardHome({ onNavigate, session, greeting }: { onNavigate: (s: Screen, asSample?: boolean) => void; session?: Session | null; greeting: 'Good morning' | 'Good afternoon' | 'Good evening' }) {
  const firstName = session?.user?.user_metadata?.full_name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'there';
  return <div className="phase2-dashboard">
    <section className="phase2-hero"><div className="phase2-hero-inner">
      <div className="phase2-hero-grid">
        <div className="phase2-hero-copy">
          <span className="phase2-greeting"><i />{greeting}, {firstName}</span>
          <h1>Your manuscript,<br /><span>checked end-to-end.</span></h1>
          <p>Check logical links between consecutive sections, citations, and the AI-text indicator in one report.</p>
          <div className="phase2-actions">
            <button className="phase2-primary" onClick={() => onNavigate('upload')}><Upload size={19} aria-hidden="true" />Start a Scan</button>
            <button className="phase2-secondary" onClick={() => onNavigate('results', true)}>Preview sample <ArrowRight size={18} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="phase2-preview-wrap" aria-label="Sample coherence report preview">
          <div className="phase2-preview-back" aria-hidden="true" />
          <div className="phase2-preview">
            <div className="phase2-preview-title"><span><FileText size={18} aria-hidden="true" /></span><strong>Coherence report</strong><em>SAMPLE</em></div>
            {[72, 81, 100, 66, 92, 88, 72, 98, 54].map((width, index) => <div key={index} className={`phase2-preview-line phase2-line-${index}`} style={{ width: `${width}%` }} />)}
            <div className="phase2-scanline" aria-hidden="true" />
          </div>
          <span className="phase2-finding phase2-finding-one"><i />Logic gap between sections</span>
          <span className="phase2-finding phase2-finding-two"><i />Citation not accessible</span>
          <span className="phase2-finding phase2-finding-three"><i />AI-text indicator</span>
        </div>
      </div>
      <div className="phase2-strip">
        <span><Link2 size={17} />Consecutive section coherence</span>
        <span><MessageSquare size={17} />Citation accessibility checks</span>
        <span><Sparkles size={17} />AI-text indicator</span>
        <strong><FileText size={17} />Word (.doc/.docx) &amp; Google Docs</strong>
      </div>
    </div></section>
    <main className="phase2-process">
      <div className="phase2-process-heading"><p>Process</p><h2>How It Works</h2><span>Four simple steps from manuscript to coherence report.</span></div>
      <div className="phase2-steps">{steps.map(({ number, label, description, icon: Icon }, index) => <article className={`phase2-step ${index % 2 ? 'phase2-step-low' : ''}`} key={number}>
        <span className="phase2-step-number" aria-hidden="true">{number}</span>
        <div className="phase2-step-icon"><Icon size={26} strokeWidth={2.2} aria-hidden="true" /></div>
        <p>Step {index + 1}</p><h3>{label}</h3><span>{description}</span>
      </article>)}</div>
    </main>
  </div>;
}
