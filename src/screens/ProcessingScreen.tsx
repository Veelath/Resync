import { useState, useEffect } from "react";
import { Logo } from '../components/AppPrimitives';
import type { Screen } from '../lib/appTypes';
import { B, BH, BL } from '../lib/brand';

export function ProcessingScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const steps = [
    { label: "Reading your manuscript", detail: "Extracting chapters, sections and references", dur: 1500 },
    { label: "Checking section alignment", detail: "Matching your headings to the expected structure", dur: 2500 },
    { label: "Analyzing cross-chapter coherence", detail: "Comparing claims across chapters", dur: 3000 },
    { label: "Verifying citation access", detail: "Checking which sources are public or private", dur: 2000 },
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
  const current = isFinalizing
    ? { label: "Finalizing your report…", detail: "Synthesizing findings across chapters" }
    : steps[done];
  // The finalizing stage is a fifth row so the list never changes height mid-scan.
  const rows = [...steps, { label: "Finalizing your report", detail: "Synthesizing findings across chapters", dur: 0 }];

  return (
    <div className="h-screen h-dvh w-full overflow-hidden bg-white flex flex-col lg:flex-row">
      {/* Left: brand + current action */}
      <div className="flex-1 lg:flex-none lg:w-[46%] min-h-0 flex flex-col items-center justify-center text-center px-6 sm:px-10 py-6" style={{ background: `linear-gradient(160deg, ${BL}, #ffffff)` }}>
        <div className="relative mb-[clamp(0.75rem,3vh,2rem)]">
          <div className="absolute inset-0 rounded-full animate-ping opacity-15" style={{ background: B }} />
          <div className="relative rounded-full flex items-center justify-center border-2 bg-white shadow-sm w-[clamp(7rem,22vh,11rem)] h-[clamp(7rem,22vh,11rem)]" style={{ borderColor: `${B}30` }}>
            <Logo className="w-[62%] h-[62%]" />
          </div>
        </div>

        <h1 className="text-[clamp(1.5rem,4vh,2.25rem)] font-bold text-gray-900 tracking-tight">Analyzing your manuscript</h1>
        <p className="text-sm text-gray-500 mt-1.5">Running {steps.length} coherence checks across all chapters</p>

        <div className="w-full max-w-sm mt-[clamp(1rem,4vh,2.25rem)]" aria-live="polite">
          <div className="flex items-baseline justify-between mb-2 gap-3">
            <span className="text-xs mono font-semibold flex items-center gap-1.5 min-w-0" style={{ color: B }}>
              <span className="w-1.5 h-1.5 rounded-full animate-ping shrink-0" style={{ background: B }} aria-hidden="true" />
              <span className="truncate">{current.label}</span>
            </span>
            <span className="text-lg mono font-bold tabular-nums" style={{ color: B }}>{pct}%</span>
          </div>
          <div
            className="h-2 rounded-full bg-gray-200/70 overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Manuscript analysis progress"
          >
            <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${B}, ${BH})` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2.5">{current.detail}</p>
        </div>
      </div>

      {/* Right: stage checklist */}
      <div className="flex-none lg:flex-1 min-h-0 flex flex-col items-center justify-center px-6 sm:px-10 py-4 lg:py-6">
        <div className="w-full max-w-md">
          <p className="hidden lg:block text-[10px] mono font-bold uppercase tracking-widest text-gray-400 mb-3">
            Step {Math.min(done + 1, rows.length)} of {rows.length}
          </p>
          <div className="space-y-[clamp(0.25rem,1vh,0.5rem)]">
            {rows.map((step, i) => {
              const isDone = done > i, isActive = done === i;
              return (
                <div key={i} className="flex items-center gap-3 sm:gap-4 px-4 py-[clamp(0.4rem,1.6vh,0.9rem)] rounded-2xl border transition-all duration-300"
                  aria-current={isActive ? "step" : undefined}
                  style={{
                    background: isDone ? "#f0fdf4" : isActive ? BL : "#fafafa",
                    borderColor: isDone ? "#bbf7d0" : isActive ? `${B}30` : "#f3f4f6",
                    opacity: !isDone && !isActive ? 0.5 : 1,
                  }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: isDone ? "#166534" : isActive ? "#111827" : "#9ca3af" }}>{step.label}</p>
                    {isActive && <p className="text-xs text-gray-500 truncate hidden sm:block">{step.detail}</p>}
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
          </div>
          <p className="text-center text-xs text-gray-400 mt-[clamp(0.75rem,3vh,1.5rem)]">2–3 minutes · do not close this tab</p>
        </div>
      </div>
    </div>
  );
}
