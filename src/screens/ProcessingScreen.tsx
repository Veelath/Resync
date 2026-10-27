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
  // The finalizing stage is the last row of the sequence.
  const rows = [...steps, { label: "Finalizing your report", detail: "Synthesizing findings across chapters", dur: 0 }];
  // Active step is fully visible; the further a step is from the active one, the fainter it is.
  const OPACITY_BY_DISTANCE = [1, 0.6, 0.4, 0.28, 0.2];

  return (
    <div className="h-screen h-dvh w-full overflow-hidden flex flex-col items-center justify-center px-6 py-4" style={{ background: `linear-gradient(180deg, ${BL}, #ffffff 55%)` }}>
      <div className="w-full max-w-lg flex flex-col items-center">
        {/* logo pulse */}
        <div className="relative mb-[clamp(0.5rem,2.5vh,1.5rem)]">
          <div className="absolute inset-0 rounded-full animate-ping opacity-15" style={{ background: B }} />
          <div className="relative rounded-full flex items-center justify-center border-2 bg-white shadow-sm w-[clamp(6rem,20vh,10rem)] h-[clamp(6rem,20vh,10rem)]" style={{ borderColor: `${B}30` }}>
            <Logo className="w-[62%] h-[62%]" />
          </div>
        </div>

        <div className="text-center mb-[clamp(0.75rem,3vh,1.75rem)]">
          <h1 className="text-[clamp(1.4rem,3.6vh,2rem)] font-bold text-gray-900 tracking-tight">Analyzing your manuscript</h1>
          <p className="text-sm text-gray-500 mt-1">Running {steps.length} coherence checks across all chapters</p>
        </div>

        {/* progress */}
        <div className="w-full mb-[clamp(0.75rem,3vh,1.75rem)]" aria-live="polite">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs mono font-semibold flex items-center gap-1.5" style={{ color: B }}>
              <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: B }} aria-hidden="true" />
              {isFinalizing ? "Finalizing your report…" : "Progress"}
            </span>
            <span className="text-sm mono font-bold tabular-nums" style={{ color: B }}>{pct}%</span>
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
        </div>

        {/* steps: finished rows fade out and collapse so the rest stay centred with no gap */}
        <div className="w-full">
          {rows.map((step, i) => {
            const isDone = done > i, isActive = done === i;
            const distance = Math.max(0, i - done);
            return (
              <div key={i} className="grid transition-all duration-700 ease-in-out"
                style={{ gridTemplateRows: isDone ? "0fr" : "1fr", opacity: isDone ? 0 : OPACITY_BY_DISTANCE[Math.min(distance, OPACITY_BY_DISTANCE.length - 1)] }}
                aria-hidden={isDone || undefined}>
                <div className="overflow-hidden min-h-0">
                  <div className="flex items-center gap-4 px-4 py-[clamp(0.45rem,1.6vh,0.9rem)] mb-[clamp(0.25rem,1vh,0.5rem)] rounded-2xl border transition-colors duration-500"
                    aria-current={isActive ? "step" : undefined}
                    style={{
                      background: isDone ? "#f0fdf4" : isActive ? BL : "#fafafa",
                      borderColor: isDone ? "#bbf7d0" : isActive ? `${B}30` : "#f3f4f6",
                    }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: isDone ? "#166534" : isActive ? "#111827" : "#6b7280" }}>{step.label}</p>
                      {isActive && <p className="text-xs text-gray-500 truncate">{step.detail}</p>}
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
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-gray-400 mt-[clamp(0.5rem,2vh,1.25rem)]">Please do not close this tab</p>
      </div>
    </div>
  );
}
