import type React from 'react';
import type { Screen } from '../lib/appTypes';
import { Logo } from './AppPrimitives';

export function AuthLayout({ children, onNavigate, onBack }: { children: React.ReactNode; onNavigate: (s: Screen) => void; onBack: () => void; quote?: string }) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between relative overflow-x-hidden" style={{ background: "#f8f9ff" }}>
      {/* Background decorations matching landing page and dashboard */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, rgba(26,31,204,0.06) 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)" }} />

      {/* Top navigation header */}
      <header className="relative z-10 w-full px-6 md:px-10 lg:px-16 xl:px-20 py-6 flex items-center justify-between">
        <button onClick={() => onNavigate("home")} className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <Logo className="h-9 w-auto" />
        </button>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-sm text-xs font-semibold text-gray-600 hover:bg-white hover:text-gray-900 transition-all shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back
        </button>
      </header>

      {/* Main centered card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[440px] bg-white rounded-3xl border border-gray-100 p-8 sm:p-10 shadow-xl" style={{ boxShadow: "0 12px 40px rgba(26,31,204,0.06)" }}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} ReSync · AI-Powered Academic Coherence Engine · All rights reserved
      </footer>
    </div>
  );
}
