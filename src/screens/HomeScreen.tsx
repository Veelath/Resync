import { ArrowRight, Check, FileText, TrendingUp, Upload, AlertTriangle } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { Logo, BackToTop, LOGO_HEADER_CLASS } from '../components/AppPrimitives';
import { ScoreRing } from '../components/AppScoreRing';
import type { Screen } from '../lib/appTypes';
import spacyLogo from '@/assets/technology/spacy.png';
import geminiLogo from '@/assets/technology/gemini.svg';
import './home-landing.css';

const nav = [{ label: 'Overview', href: '#section-overview' }, { label: 'Capabilities', href: '#section-capabilities' }, { label: 'About', href: '#section-about' }];
const checks = [
  ['Section Flow', 'Does each section logically connect with the one before it?'],
  ['Objectives Alignment', 'Do neighboring sections support the stated objectives?'],
  ['Methodology Fit', 'Does the next section follow from the methods described?'],
  ['Claim Support', 'Do claims follow from the evidence in neighboring sections?'],
  ['Citation Accessibility', 'Check cited URLs and DOIs for public reachability.'],
  ['AI-Text Indicator', 'Review a signal for possible AI-generated text.'],
];

function ReportPreview() {
  return <div className="lp-preview" aria-label="Example coherence report preview">
    <div className="lp-window"><span className="lp-dots" aria-hidden="true"><i /><i /><i /></span><span>resync_report.pdf</span></div>
    <div className="lp-preview-body">
      <div className="lp-summary"><ScoreRing score={74} size={84} /><div className="lp-counts"><div><span>Logic gaps</span><strong>2</strong></div><div><span>Contradictions</span><strong>2</strong></div><div><span>Redundancies</span><strong>1</strong></div></div></div>
      <div className="lp-excerpt"><span className="lp-mono-label">Chapter 1 · Statement of the problem</span><p>The study aims to <mark>measure student engagement using biometric data</mark> collected over one semester.</p></div>
      <div className="lp-finding"><strong>Logic gap · Objectives → Methodology</strong><span>Biometric collection is promised in Objectives but absent from Methodology.</span></div>
      <div className="lp-preview-foot"><span>✓&nbsp; 4 public</span><span>×&nbsp; 2 private</span><small>~2 min scan</small></div>
    </div>
  </div>;
}

export function HomeScreen({ onNavigate, session }: { onNavigate: (s: Screen, asSample?: boolean) => void; session?: Session | null }) {
  const start = () => onNavigate(session ? 'upload' : 'signup');
  const sample = () => onNavigate('results', true);
  return <div className="landing-page">
    <nav className="lp-nav" aria-label="Main navigation"><div className="lp-wrap lp-nav-inner">
      <a className="lp-brand" href="#top" aria-label="ReSync, back to top"><Logo header className={LOGO_HEADER_CLASS} /></a>
      <div className="lp-nav-links">{nav.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</div>
      <div className="lp-nav-actions">{session ? <button className="lp-btn lp-btn-primary lp-nav-cta" onClick={() => onNavigate('dashboard')}>Go to Dashboard</button> : <><button className="lp-login" onClick={() => onNavigate('login')}>Log in</button><button className="lp-btn lp-btn-primary lp-nav-cta" onClick={() => onNavigate('signup')}>Sign up free</button></>}</div>
    </div></nav>

    <main id="top">
      <header id="section-overview" className="lp-hero"><div className="lp-wrap lp-hero-grid">
        <div className="lp-hero-copy"><span className="lp-tag"><i />Manuscript coherence checker</span><h1>Check your manuscript <span>for coherence.</span></h1><p>ReSync reviews consecutive section links, citations, and the AI-text indicator. Receive a clear report that helps you focus your revisions.</p><div className="lp-hero-actions"><button className="lp-btn lp-btn-primary" onClick={start}>Get started <ArrowRight size={18} /></button><button className="lp-btn lp-btn-secondary" onClick={sample}>View sample report</button></div><ul className="lp-benefits"><li><Check />Free preview with every scan</li><li><Check />Results in ~2 min</li><li><Check />No credit card needed</li></ul></div>
        <div className="lp-hero-art"><ReportPreview /><div className="lp-float lp-score-float"><span><TrendingUp size={18} /></span><div><strong>Score improved</strong><small>74 → 84 after revision</small></div></div><div className="lp-float lp-alert-float"><i />Contradiction detected</div></div>
      </div></header>

      <section className="lp-stats lp-wrap" aria-label="ReSync at a glance"><div><strong>4</strong><span>Coherence dimensions</span></div><div><strong>~2 min</strong><span>Per full thesis</span></div><div><strong>.doc/.docx</strong><span>or Google Docs link</span></div><div><strong>3 models</strong><span>Support the analysis</span></div></section>

      <section className="lp-process lp-wrap" aria-labelledby="lp-process-title"><div className="lp-process-heading"><span className="lp-eyebrow">How it works</span><h2 id="lp-process-title">Template, upload, scan, then review your report</h2></div><div className="lp-steps">
        <div className="lp-step"><div className="lp-step-copy"><span className="lp-step-number">01</span><span className="lp-eyebrow">Template · Step 1</span><h3>Set chapter headings (optional)</h3><p>Attach and edit a chapter template, use a saved one, or skip to let ReSync detect headings from your manuscript.</p></div><div className="lp-mock lp-template"><span className="lp-mono-label">Chapter template</span>{['Introduction', 'Methodology', 'Results', 'References'].map((name, i) => <div className="lp-template-row" key={name}><span>0{i + 1}</span>{name}</div>)}<small>Optional · detected headings work too</small></div></div>
        <div className="lp-step lp-flip"><div className="lp-step-copy"><span className="lp-step-number">02</span><span className="lp-eyebrow">Upload · Step 2</span><h3>Upload your manuscript</h3><p>Add a <strong>Word file (.doc/.docx)</strong> or paste a <strong>Google Docs link</strong>. ReSync identifies sections and checks how each connects to the next.</p><div className="lp-tags"><span>Section detection</span><span>Citation checks</span><span>AI-text indicator</span></div></div><div className="lp-mock lp-upload"><div className="lp-drop"><span className="lp-upload-icon"><Upload size={26} /></span><strong>Drop your thesis here</strong><small>.doc, .docx or Google Docs link · max 25 MB</small><span className="lp-or">or</span><button className="lp-btn lp-btn-primary" onClick={start}>Browse file</button></div><div className="lp-detected"><strong><Check size={15} />Detected sections</strong><div>{['Introduction', 'RRL', 'Methodology', 'Results', 'Conclusion'].map(name => <span key={name}>{name}</span>)}</div></div></div></div>
        <div className="lp-step"><div className="lp-step-copy"><span className="lp-step-number">03</span><span className="lp-eyebrow">Scan · Step 3</span><h3>Review connections between sections</h3><p>ReSync compares consecutive sections to identify weak logical links or conflicting information in your manuscript.</p><ul className="lp-scan-list"><li>Checks how each section relates to the next</li><li>Reviews citations and the AI-text indicator</li><li>Flags findings that need the author's review</li></ul></div><div className="lp-mock lp-scan"><div className="lp-scan-paragraph"><span className="lp-mono-label">Chapter 1 · Objectives</span><p>The study will <mark>measure engagement using biometric data</mark> collected over one semester.</p></div><div className="lp-connector" aria-hidden="true" /><div className="lp-scan-paragraph"><span className="lp-mono-label">Chapter 2 · Methodology</span><p>Data were collected using the <strong>Maslach Burnout Inventory</strong> and the AWS survey instrument only.</p></div><div className="lp-scan-alert"><span><AlertTriangle size={18} /></span><div><strong>Contradiction detected</strong><small>Objectives ↔ Methodology</small></div></div></div></div>
        <div className="lp-step lp-flip"><div className="lp-step-copy"><span className="lp-step-number">04</span><span className="lp-eyebrow">Report · Step 4</span><h3>Review the report</h3><p>Every scan includes a free preview. Unlock the full report for 1 credit to see highlighted passages, explanations, and suggested revisions.</p><div className="lp-tags"><span>Inline highlights</span><span>Fix suggestions</span><span>Coherence score</span><span>Citation check</span></div></div><div className="lp-mock lp-report"><div className="lp-report-head"><ScoreRing score={84} size={76} showLabel={false} /><div><small>Manuscript</small><strong>Predictors of Academic Burnout Among STEM Undergraduates</strong><span>Score improved · ↑ from 74</span></div></div><span className="lp-mono-label">Revision plan</span><div className="lp-revision done"><Check size={17} />Align biometric data collection with Methodology chapter</div><div className="lp-revision done"><Check size={17} />Reconcile sample size n=120 vs n=106 in Chapter 4</div><div className="lp-revision"><span className="lp-empty-check" />Remove duplicate technology acceptance definition</div><div className="lp-revision"><span className="lp-empty-check" />Revise Conclusions to reflect null tutoring result</div></div></div>
      </div></section>

      <section id="section-about" className="lp-about lp-wrap" aria-labelledby="lp-about-title"><div className="lp-about-panel"><div><span className="lp-eyebrow">AI technologies used</span><h2 id="lp-about-title">Models that support the review</h2><p>ReSync uses AI models to assess links between consecutive sections, then generate findings and revision recommendations.</p><p className="lp-about-note">The output is AI-generated and is not fully human-verified. Review each suggestion with your adviser before making changes.</p></div><div className="lp-models"><div><img src={spacyLogo} alt="spaCy" /></div><div><img src={geminiLogo} alt="Gemini" /></div><div>MiniLM-L6-V2</div></div></div></section>

      <section id="section-capabilities" className="lp-capabilities lp-wrap" aria-labelledby="lp-capabilities-title"><div className="lp-cap-heading"><div><span className="lp-eyebrow">Key capabilities</span><h2 id="lp-capabilities-title">What ReSync checks</h2></div><button onClick={sample}>View sample report <ArrowRight size={17} /></button></div><div className="lp-cap-grid">{checks.map(([title, body], i) => <article className="lp-cap" key={title}><span>{String(i + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{body}</p></article>)}</div><p className="lp-score-note"><FileText size={18} />The four-part coherence score covers objectives, methodology, claims, and numbers.</p></section>

      <section className="lp-cta lp-wrap"><div><Logo header className="lp-cta-logo" /><h2>Review your manuscript with ReSync</h2><p>Create an account to upload your paper. Every scan includes a free preview; the full report unlocks for 1 credit.</p><button className="lp-btn lp-btn-white" onClick={start}>Get started <ArrowRight size={18} /></button></div></section>
    </main>

    <footer className="lp-footer"><div className="lp-wrap"><div className="lp-footer-links"><a href="#top" aria-label="ReSync, back to top"><Logo header className="lp-footer-logo" /></a>{nav.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}{session ? <button onClick={() => onNavigate('dashboard')}>Dashboard</button> : <button onClick={() => onNavigate('login')}>Log in</button>}<a href="/privacy">Privacy</a><a href="/terms">Terms</a></div><p>ReSync is a decision-support tool. Final judgment on your manuscript always rests with your adviser and panel.</p></div></footer>
    <BackToTop />
  </div>;
}
