import { useState, useEffect } from "react";
import { Logo } from '../components/AppPrimitives';
import type { Screen } from '../lib/appTypes';
import { B, BH, BL } from '../lib/brand';

export function ProcessingScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const steps = [
    { label: "Reading your manuscript", dur: 1500 },
    { label: "Checking section alignment", dur: 2500 },
    { label: "Analyzing cross-chapter coherence", dur: 3000 },
    { label: "Verifying citation links", dur: 2000 },
  ];
  const [done, setDone] = useState(0);
  useEffect(() => {
    let t = 0;
    const timers: NodeJS.Timeout[] = [];
    steps.forEach((s, i) => {
      t += s.dur;
      timers.push(setTimeout(() => setDone(i + 1), t));
    });
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);
  const isFinalizing = done >= steps.length;
  const pct = isFinalizing ? 99 : Math.min(99, Math.round((done / steps.length) * 100));

  return (
    <div className="min-h-full bg-white flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-lg">
        {/* logo pulse */}
        <div className="flex justify-center mb-10">
          <div className="relative">
            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: B }} />
            <div className="relative w-20 h-20 rounded-full flex items-center justify-center border-2" style={{ background: BL, borderColor: `${B}30` }}>
              <Logo className="w-12 h-12" />
            </div>
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Analyzing your manuscript</h1>
          <p className="text-sm text-gray-400">Running {steps.length} coherence checks across all chapters</p>
        </div>

        {/* progress */}
        <div className="flex justify-between items-center mb-2" aria-live="polite">
          {pct === 99 ? (
            <span className="text-xs mono font-semibold animate-pulse flex items-center gap-1.5" style={{ color: B }}>
              <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: B }} aria-hidden="true" />
              Finalizing your report…
            </span>
          ) : (
            <span className="text-xs mono text-gray-400">Progress</span>
          )}
          <span className="text-xs mono font-bold tabular-nums" style={{ color: B }}>{pct}%</span>
        </div>
        <div
          className="h-1.5 rounded-full bg-gray-100 mb-8 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Manuscript analysis progress"
        >
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${B}, ${BH})` }} />
        </div>

        <div className="space-y-2">
          {steps.map((step, i) => {
            const isDone = done > i, isActive = done === i;
            return (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300"
                aria-current={isActive ? "step" : undefined}
                style={{
                  background: isDone ? "#f0fdf4" : isActive ? BL : "#fafafa",
                  borderColor: isDone ? "#bbf7d0" : isActive ? `${B}30` : "#f3f4f6",
                  opacity: !isDone && !isActive ? 0.5 : 1,
                }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: isDone ? "#166534" : isActive ? "#111827" : "#9ca3af" }}>{step.label}</p>
                </div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: isDone ? "#22c55e" : isActive ? B : "#e5e7eb" }}>
                  {isDone
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3.5 h-3.5" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
                    : isActive
                      ? <div className="w-2 h-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
                      : <span className="text-xs font-bold text-gray-400 mono tabular-nums">{i + 1}</span>
                  }
                </div>
              </div>
            );
          })}
          {isFinalizing && (
            <div className="flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 animate-pulse"
              style={{
                background: BL,
                borderColor: `${B}30`,
              }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">Finalizing your report…</p>
                <p className="text-xs text-gray-500">Synthesizing findings across chapters</p>
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: B }}>
                <div className="w-2 h-2 rounded-full bg-white animate-ping" />
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-8">2–3 minutes · do not close this tab</p>
      </div>
    </div>
  );
}
