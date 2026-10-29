import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import resyncLogo from '@/imports/Untitled_design__1_.webp';
import './app-primitives.css';

export function Logo({ className = "", header = false }: { className?: string; header?: boolean }) {
  if (header) return <span className={`relative block shrink-0 overflow-hidden aspect-[3135/1542] ${className}`}><img src={resyncLogo} alt="ReSync" className="absolute max-w-none" style={{ width: "116.91%", height: "205.25%", left: "-8.006%", top: "-48.703%" }} /></span>;
  return <img src={resyncLogo} alt="ReSync" className={`object-contain ${className}`} />;
}

// One header-logo size for every screen (home, dashboard, auth).
export const LOGO_HEADER_CLASS = "h-10 sm:h-12";

export function HomeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Home"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.5" /></svg>
      Home
    </button>
  );
}

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => {
      const maximum = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(maximum > 0 && window.scrollY >= Math.min(maximum * .75, Math.max(0, maximum - 200)));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);
  return <button type="button" aria-label="Back to top" aria-hidden={!visible} tabIndex={visible ? 0 : -1}
    onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}
    className={`resync-back-to-top ${visible ? 'is-visible' : ''}`}>
    <ArrowUp size={22} strokeWidth={2.5} aria-hidden="true" />
  </button>;
}

export function Spinner({ cls = "w-4 h-4" }: { cls?: string }) {
  return <svg className={`${cls} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" /></svg>;
}

export function Eye({ open }: { open: boolean }) {
  return open
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" /></svg>
    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
}

export function GIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>;
}
