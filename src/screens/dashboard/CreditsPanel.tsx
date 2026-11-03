import type { Screen } from '../../lib/appTypes';
import type { Dispatch, SetStateAction } from 'react';
import '../upload-flow.css';

export interface CreditActivity { ledger_id: string; kind: string; delta: number; balance_after: number; note?: string | null; created_at: string }

function when(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

export function CreditsPanel({ creditsLoading, creditBalance, creditsUsed, history = [], setPaymentError, setCreditModalStep, cardName, setCardName, profile, setShowBuyCreditsModal, onNavigate }: {
  creditsLoading: boolean;
  creditBalance: number | null;
  creditsUsed: number | null;
  history?: CreditActivity[];
  setPaymentError: Dispatch<SetStateAction<string>>;
  setCreditModalStep: Dispatch<SetStateAction<"package" | "payment" | "processing" | "success">>;
  cardName: string;
  setCardName: Dispatch<SetStateAction<string>>;
  profile: { fullName: string };
  setShowBuyCreditsModal: Dispatch<SetStateAction<boolean>>;
  onNavigate: (screen: Screen, asSample?: boolean) => void;
}) {
  function openBuyCredits() {
    setPaymentError("");
    setCreditModalStep("package");
    if (!cardName) setCardName(profile.fullName || "Thesis Author");
    setShowBuyCreditsModal(true);
  }

  const available = creditBalance;
  const used = creditsUsed ?? 0;
  const total = available !== null ? available + used : null;
  const usedShare = total ? Math.min(100, Math.max(2, Math.round((used / total) * 100))) : 2;
  const text = (value: number | null) => creditsLoading ? "…" : value !== null ? String(value) : "—";
  const scans = history.filter(entry => entry.kind === "debit");

  return (
    <main className="uf" style={{ minHeight: "auto", background: "transparent" }}>
      <div className="uf-wrap" style={{ paddingTop: 28 }}>
        <div className="uf-head">
          <div>
            <div className="uf-eb">Account usage</div>
            <h1 className="uf-h1">Usage &amp; credits</h1>
            <p className="uf-sub">View your available credits and current usage.</p>
          </div>
          <button type="button" onClick={openBuyCredits} className="uf-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-4 h-4" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Buy credits
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          <div className="uf-card" style={{ padding: 26, background: "linear-gradient(135deg,#17136F,#3A33E6)", border: 0, color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 20, minHeight: 220 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="uf-ic" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9 10h4.5a1.5 1.5 0 010 3H9.5a1.5 1.5 0 000 3H15" /></svg>
              </span>
              <button type="button" onClick={openBuyCredits} className="uf-btn is-sm" style={{ background: "#fff", color: "#2b25c8", boxShadow: "none" }}>+ Top up</button>
            </div>
            <div>
              <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1 }}>{text(available)}</div>
              <div style={{ fontSize: 14, color: "#c9c7ff", marginTop: 6 }}>Credits available</div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#c9c7ff", marginBottom: 6 }}>
                <span>{creditsLoading || creditsUsed === null ? "…" : used} used</span>
                <span>{creditsLoading || total === null ? "…" : total} total</span>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: "rgba(255,255,255,.18)" }}>
                <i style={{ display: "block", width: `${usedShare}%`, height: "100%", borderRadius: 8, background: "#fff" }} />
              </div>
            </div>
          </div>

          <div className="uf-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
            <span className="uf-ic" style={{ background: "#e3f8ef", color: "#0b9f6e" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
            </span>
            <div>
              <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-.02em", color: "#0b9f6e", lineHeight: 1.1 }}>{text(creditsUsed)}</div>
              <div style={{ fontSize: 14, color: "#6b6890" }}>Credits used</div>
            </div>
          </div>

          <div className="uf-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
            <span className="uf-ic" style={{ background: "#fff3db", color: "#c77a0b" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>
            </span>
            <div>
              <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-.02em", color: "#c77a0b", lineHeight: 1.1 }}>1 credit</div>
              <div style={{ fontSize: 14, color: "#6b6890" }}>Cost per scan</div>
            </div>
          </div>
        </div>

        <div className="uf-card" style={{ padding: "26px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24, background: "linear-gradient(90deg,#fff,#f3f2ff)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span className="uf-ic" style={{ width: 52, height: 52 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h4" /></svg>
            </span>
            <div>
              <b style={{ fontSize: 19 }}>Ready to review a manuscript?</b>
              <div style={{ fontSize: 14, color: "#6b6890" }}>Each complete coherence scan uses one credit.{available !== null && available > 0 && available < 999 ? ` You can run up to ${available} ${available === 1 ? "scan" : "scans"}.` : ""}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={openBuyCredits} className="uf-btn is-ghost">Buy credits</button>
            <button type="button" onClick={() => onNavigate("upload")} className="uf-btn">
              Start a scan
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-4 h-4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>

        <div className="uf-card" style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ fontSize: 16 }}>Recent scans</b>
            <span className="uf-pill">{scans.length} so far</span>
          </div>
          {scans.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "28px 0 18px", color: "#7d7b9e", fontSize: 14 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>
              No scans yet. Your credit activity will appear here after your first scan.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
              {scans.slice(0, 8).map(entry => (
                <li key={entry.ledger_id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: "1px solid #eeedfb", fontSize: 14 }}>
                  <span>{entry.note || "Coherence scan"}<span style={{ display: "block", fontSize: 12, color: "#7d7b9e" }}>{when(entry.created_at)}</span></span>
                  <b style={{ color: "#5a5778", whiteSpace: "nowrap" }}>{entry.delta} credit · {entry.balance_after} left</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
