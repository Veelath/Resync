import { B, BH, BL } from '../../lib/brand';
import type { Screen } from '../../lib/appTypes';
import type { Dispatch, SetStateAction } from 'react';

export function CreditsPanel({ creditsLoading, creditBalance, creditsUsed, setPaymentError, setCreditModalStep, cardName, setCardName, profile, setShowBuyCreditsModal, onNavigate }: {
  creditsLoading: boolean;
  creditBalance: number | null;
  creditsUsed: number | null;
  setPaymentError: Dispatch<SetStateAction<string>>;
  setCreditModalStep: Dispatch<SetStateAction<"package" | "payment" | "processing" | "success">>;
  cardName: string;
  setCardName: Dispatch<SetStateAction<string>>;
  profile: { fullName: string };
  setShowBuyCreditsModal: Dispatch<SetStateAction<boolean>>;
  onNavigate: (screen: Screen, asSample?: boolean) => void;
}) {
  return (
        <main className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: B }}>Account usage</p>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Usage / Credits</h2>
              <p className="text-xs text-gray-400 mt-1">View your available credits and current usage.</p>
            </div>
            <button
              onClick={() => {
                setPaymentError("");
                setCreditModalStep("package");
                if (!cardName) setCardName(profile.fullName || "Thesis Author");
                setShowBuyCreditsModal(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-all hover:opacity-90 cursor-pointer"
              style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}
            >
              + Buy Credits
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { value: creditsLoading ? "…" : creditBalance !== null ? String(creditBalance) : "—", label: "Credits available", color: B, bg: BL, topUp: true },
              { value: creditsLoading ? "…" : creditsUsed !== null ? String(creditsUsed) : "—", label: "Credits used", color: "#059669", bg: "#f0fdf4" },
              { value: "1 credit", label: "Cost per scan", color: "#d97706", bg: "#fffbeb" },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col justify-between" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: item.bg, color: item.color }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    </div>
                    {item.topUp && (
                      <button
                        onClick={() => {
                          setPaymentError("");
                          setCreditModalStep("package");
                          if (!cardName) setCardName(profile.fullName || "Thesis Author");
                          setShowBuyCreditsModal(true);
                        }}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg border transition-all hover:bg-gray-50 flex items-center gap-1 cursor-pointer"
                        style={{ borderColor: `${B}30`, color: B }}
                      >
                        + Top up
                      </button>
                    )}
                  </div>
                  <p className="text-2xl font-bold mono" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Ready to review a manuscript?</h3>
              <p className="text-xs text-gray-400 mt-1">Each complete coherence scan uses one credit.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPaymentError("");
                  setCreditModalStep("package");
                  if (!cardName) setCardName(profile.fullName || "Thesis Author");
                  setShowBuyCreditsModal(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors hover:bg-gray-50 cursor-pointer"
                style={{ borderColor: `${B}30`, color: B }}
              >
                Buy Credits
              </button>
              <button onClick={() => onNavigate("upload")} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer" style={{ background: B }}>Start a Scan</button>
            </div>
          </div>
        </main>
  );
}
