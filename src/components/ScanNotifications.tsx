import { B } from '../lib/brand';

// ─── Notifications & completion sound ───────────────────────────────────
export type AppNotification = { id: string; kind: "success" | "error"; title: string; message: string; at: number; read: boolean };

let sharedAudioCtx: AudioContext | null = null;

// Browsers only allow audio after a user gesture, so this is called from the "Run scan" click.
export function unlockAudio() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
    if (sharedAudioCtx.state === "suspended") void sharedAudioCtx.resume();
  } catch { /* audio unavailable */ }
}

// Returns false when the browser still blocks audio, so the caller can offer an "Enable sound" fallback.
export function playCompletionChime(): boolean {
  try {
    const ctx = sharedAudioCtx;
    if (!ctx || ctx.state !== "running") return false;
    [[659.25, 0, 0.5], [880, 0.14, 0.6]].forEach(([freq, delay, len]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + delay;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.18, t0 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + len);
    });
    return true;
  } catch {
    return false;
  }
}

export const NOTIFICATIONS_KEY = "resync_notifications";

export function loadNotifications(): AppNotification[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function timeAgo(at: number): string {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs} h ago` : `${Math.round(hrs / 24)} d ago`;
}

export function ToastBanner({ toast, soundBlocked, onView, onEnableSound, onClose }: {
  toast: AppNotification | null; soundBlocked: boolean; onView?: () => void; onEnableSound: () => void; onClose: () => void;
}) {
  if (!toast) return null;
  const ok = toast.kind === "success";
  return (
    <div role="status" aria-live="polite" className="fixed top-4 right-4 z-[100] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border bg-white p-4 shadow-xl animate-slide-in"
      style={{ borderColor: ok ? "#bbf7d0" : "#fecaca" }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: ok ? "#22c55e" : "#ef4444" }}>
          {ok
            ? <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-4 h-4" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-4 h-4" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">{toast.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{toast.message}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {onView && <button type="button" onClick={onView} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: B }}>View report</button>}
            {ok && soundBlocked && <button type="button" onClick={onEnableSound} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50">Enable sound</button>}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Dismiss notification" className="text-gray-400 hover:text-gray-700 shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}

