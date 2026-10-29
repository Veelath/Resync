import type React from 'react';
import type { Screen } from '../lib/appTypes';
import resyncLogo from '@/imports/Untitled_design__1_.webp';
import { Logo, LOGO_HEADER_CLASS } from './AppPrimitives';
import './auth-shell.css';

const SHEETS: { z: number; lines: number[]; highlights: Record<number, string> }[] = [
  { z: 0, lines: [88, 94, 70, 90, 60, 84, 76], highlights: {} },
  { z: 70, lines: [92, 80, 90, 66, 86, 94, 58], highlights: { 1: 'auth-hl-a', 5: 'auth-hl-r' } },
  { z: 140, lines: [90, 72, 94, 82, 88, 62, 80], highlights: { 2: 'auth-hl-i', 5: 'auth-hl-a' } },
];

const PINS = [
  { z: 0, left: 30, top: 60, delay: 0 },
  { z: 0, left: 210, top: 230, delay: 0.6 },
  { z: 70, left: 30, top: 230, delay: 1.2 },
  { z: 70, left: 210, top: 70, delay: 1.8 },
  { z: 140, left: 120, top: 30, delay: 2.4 },
];

export function AuthShell({ children, onNavigate, onBack }: { children: React.ReactNode; onNavigate: (s: Screen) => void; onBack: () => void }) {
  return (
    <div className="auth-page">
      <div className="auth-frame">
        <header className="auth-header">
          <button type="button" onClick={() => onNavigate("home")} className="auth-focus transition-opacity hover:opacity-80 rounded-md">
            <Logo header className={LOGO_HEADER_CLASS} />
          </button>
          <button type="button" onClick={onBack} className="auth-back auth-focus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Back
          </button>
        </header>

        <main className="auth-main">
          <div className="auth-main-inner">{children}</div>
        </main>

        <aside className="auth-panel" aria-hidden="true">
          <svg className="auth-panel-waves" viewBox="0 0 778 800" preserveAspectRatio="none">
            <defs>
              <linearGradient id="auth-wave-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#2d35e8" />
                <stop offset="0.6" stopColor="#1a1fcc" />
                <stop offset="1" stopColor="#121780" />
              </linearGradient>
              <radialGradient id="auth-wave-glow" cx="0.6" cy="0.5" r="0.6">
                <stop offset="0" stopColor="#5a63ff" stopOpacity="0.5" />
                <stop offset="1" stopColor="#5a63ff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path d="M778,0 L382,0 C217,12 150,150 204,300 C260,456 150,620 42,800 L778,800 Z" fill="#1a1fcc" fillOpacity="0.12" />
            <path d="M778,0 L418,0 C252,18 186,152 240,302 C296,458 188,622 82,800 L778,800 Z" fill="#1a1fcc" fillOpacity="0.3" />
            <path d="M778,0 L454,0 C288,24 222,154 276,304 C332,460 226,624 122,800 L778,800 Z" fill="url(#auth-wave-fill)" />
            <ellipse cx="482" cy="420" rx="380" ry="310" fill="url(#auth-wave-glow)" />
          </svg>

          <div className="auth-scene">
            <div className="auth-stack">
              {SHEETS.map(sheet => (
                <div key={sheet.z} className="auth-page-sheet" style={{ ['--z' as string]: `${sheet.z}px` }}>
                  {sheet.lines.map((width, lineIndex) => (
                    <span key={lineIndex} className={`auth-line ${sheet.highlights[lineIndex] ?? ''}`} style={{ width: `${width}%` }} />
                  ))}
                </div>
              ))}
              <div className="auth-page-sheet is-top" style={{ ['--z' as string]: '210px' }}>
                <span className="auth-line" style={{ width: '60%' }} />
                <span className="auth-line" style={{ width: '86%' }} />
                <span className="auth-line" style={{ width: '74%' }} />
                <span className="auth-beam" />
                <span className="auth-rep"><b /><b /><b /></span>
              </div>
              {PINS.map((pin, index) => (
                <span key={index} className="auth-pin" style={{ ['--z' as string]: `${pin.z}px`, left: pin.left, top: pin.top }}>
                  <i style={{ animationDelay: `${pin.delay}s` }} />
                </span>
              ))}
            </div>

            <span className="auth-tag" style={{ left: 10, top: 306 }}>Ch. 1</span>
            <span className="auth-tag" style={{ left: 16, top: 250 }}>Ch. 2</span>
            <span className="auth-tag" style={{ left: 22, top: 194 }}>Ch. 3</span>
            <span className="auth-tag" style={{ left: 16, top: 120 }}>Report</span>
          </div>

          <div className="auth-badge">
            <span className="auth-badge-ping" />
            <span className="auth-badge-ping is-second" />
            <span className="auth-badge-core">
              <img src={resyncLogo} alt="" />
            </span>
          </div>

          <span className="auth-chip" style={{ left: 82, top: 150, animationDelay: '0s' }}>
            <span className="auth-chip-dot" style={{ background: '#34c16f' }} />Section links connected
          </span>
          <span className="auth-chip" style={{ right: 80, top: 128, animationDelay: '2.6s' }}>
            <span className="auth-chip-dot" style={{ background: '#f5a524' }} />Suggestions highlighted
          </span>
          <span className="auth-chip" style={{ right: 64, bottom: 170, animationDelay: '1.4s' }}>
            <span className="auth-chip-dot" style={{ background: '#e5466a' }} />1 citation not accessible
          </span>

          <p className="auth-footnote">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
            256-bit encryption · Academic manuscript privacy guaranteed
          </p>
        </aside>
      </div>

      <footer className="auth-footer">
        © {new Date().getFullYear()} ReSync · AI-Powered Academic Coherence Engine · All rights reserved
      </footer>
    </div>
  );
}
