import { CREDIT_PACKAGES } from './helpers';
import { B, BH } from '../../lib/brand';
import type { Dispatch, FormEvent, RefObject, SetStateAction } from 'react';

export function PaymentModal({ creditBalance, creditModalStep, setCreditModalStep, selectedPkgId, setSelectedPkgId, selectedPkg, receiptRef, receiptTime, receiptLast4, receiptAmount, cardNumber, setCardNumber, cardExpiry, setCardExpiry, cardCvc, setCardCvc, cardName, setCardName, paymentError, setPaymentError, purchasedCredits, closeBuyCreditsModal, handlePaymentSubmit }: { creditBalance: number | null; creditModalStep: "package" | "payment" | "processing" | "success"; setCreditModalStep: Dispatch<SetStateAction<"package" | "payment" | "processing" | "success">>; selectedPkgId: string; setSelectedPkgId: Dispatch<SetStateAction<string>>; selectedPkg: (typeof CREDIT_PACKAGES)[number]; receiptRef: string | null; receiptTime: Date | null; receiptLast4: string; receiptAmount: number; cardNumber: string; setCardNumber: Dispatch<SetStateAction<string>>; cardExpiry: string; setCardExpiry: Dispatch<SetStateAction<string>>; cardCvc: string; setCardCvc: Dispatch<SetStateAction<string>>; cardName: string; setCardName: Dispatch<SetStateAction<string>>; paymentError: string; setPaymentError: Dispatch<SetStateAction<string>>; purchasedCredits: number; closeBuyCreditsModal: () => void; handlePaymentSubmit: (e: FormEvent) => Promise<void> }) {
  return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && creditModalStep !== "processing") {
              closeBuyCreditsModal();
            }
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden transition-all"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Demo Banner */}
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-amber-800 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-amber-600 shrink-0">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                DEMO MODE · Simulated Sandbox — no real card or bank is charged
              </span>
              <span className="text-[10px] uppercase tracking-wider bg-amber-200/60 px-2 py-0.5 rounded text-amber-900 font-bold">
                Simulated Sandbox
              </span>
            </div>

            {/* Modal Header */}
            <div className="px-6 pt-5 pb-3 flex items-start justify-between border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Purchase Scan Credits</h3>
                <p className="text-xs text-gray-500 mt-0.5">Scan credits never expire and apply to any thesis analysis.</p>
              </div>
              <button
                type="button"
                onClick={closeBuyCreditsModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Step 1: Package Selection */}
            {creditModalStep === "package" && (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {CREDIT_PACKAGES.map((pkg) => {
                    const isSelected = selectedPkgId === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPkgId(pkg.id)}
                        className={`relative rounded-2xl p-4 border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/40 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        {pkg.badge && (
                          <span className="absolute -top-2.5 right-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                            {pkg.badge}
                          </span>
                        )}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-900">{pkg.name}</span>
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 mb-0.5">
                            {pkg.credits} <span className="text-xs font-medium text-gray-500">Credits</span>
                          </p>
                          <p className="text-xs text-gray-500 leading-snug">{pkg.subtitle}</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-baseline justify-between">
                          <span className="text-lg font-bold text-gray-900">₱{pkg.price.toLocaleString('en-PH')}</span>
                          <span className="text-[10px] text-gray-400 mono">{pkg.perCredit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    Selected: <strong className="text-gray-900">{selectedPkg.credits} Credits</strong> for{" "}
                    <strong className="text-gray-900">
                      ₱{selectedPkg.price.toLocaleString('en-PH')}
                    </strong>
                  </span>
                  <span className="text-gray-400 text-[11px]">Instant ledger crediting</span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeBuyCreditsModal}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentError("");
                      setCreditModalStep("payment");
                    }}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}
                  >
                    Continue to Payment →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment Details */}
            {creditModalStep === "payment" && (
              <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentError("");
                      setCreditModalStep("package");
                    }}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
                  >
                    ← Back to packages
                  </button>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">Order Summary: </span>
                    <span className="text-xs font-bold text-gray-900">
                      {selectedPkg.credits} Credits — ₱{selectedPkg.price.toLocaleString('en-PH')}
                    </span>
                  </div>
                </div>

                {paymentError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0 text-red-600">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>{paymentError}</span>
                  </div>
                )}

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      placeholder="Thesis Author"
                      className="w-full h-10 px-3.5 rounded-xl border text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                      style={{ borderColor: "#e5e7eb" }}
                      onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                      onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                        placeholder="4242 4242 4242 4242"
                        className="w-full h-10 px-3.5 pr-10 rounded-xl border text-sm font-mono text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                        style={{ borderColor: "#e5e7eb" }}
                        onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                        onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center text-gray-400 pointer-events-none">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Expiration Date</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full h-10 px-3.5 rounded-xl border text-sm font-mono text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                        style={{ borderColor: "#e5e7eb" }}
                        onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                        onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">CVC / CVV</label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        className="w-full h-10 px-3.5 rounded-xl border text-sm font-mono text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                        style={{ borderColor: "#e5e7eb" }}
                        onFocus={e => { e.target.style.borderColor = B; e.target.style.boxShadow = `0 0 0 3px ${B}12`; }}
                        onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all shadow-sm flex items-center justify-center gap-2 hover:opacity-90 cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}
                  >
                    Pay ₱{selectedPkg.price.toLocaleString('en-PH')} (Simulated)
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-400">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  <span>Encrypted 256-bit Demo SSL · Test Card 4242</span>
                </div>
              </form>
            )}

            {/* Step 3: Processing */}
            {creditModalStep === "processing" && (
              <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mb-2" />
                <h4 className="text-base font-bold text-gray-900">Processing simulated transaction...</h4>
                <p className="text-xs text-gray-400 max-w-xs">Contacting credit ledger provider...</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold mono">
                  Simulating instant payment confirmation
                </div>
              </div>
            )}

            {/* Step 4: Success / Receipt */}
            {creditModalStep === "success" && (
              <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-5">
                <style>{`
                  @media print {
                    body * { visibility: hidden !important; }
                    .receipt-printable, .receipt-printable * { visibility: visible !important; }
                    .receipt-printable {
                      position: fixed !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      max-width: 100% !important;
                      box-shadow: none !important;
                      border: 1px solid #e5e7eb !important;
                      background: #ffffff !important;
                      padding: 24px !important;
                    }
                  }
                `}</style>

                {/* Header */}
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">Payment Successful</h4>
                  <p className="text-xs text-amber-700 font-medium mt-1">Simulated Sandbox — no real charge was made</p>
                </div>

                {/* Receipt card */}
                <div className="receipt-printable w-full rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 space-y-3 text-xs text-left font-mono shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-sans text-[11px]">Transaction ID</span>
                    <span className="font-bold text-gray-900">{receiptRef || "SIM-PENDING"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-sans text-[11px]">Date &amp; Time</span>
                    <span className="text-gray-800">
                      {receiptTime
                        ? `${receiptTime.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })} PST`
                        : "Just now"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-sans text-[11px]">Package</span>
                    <span className="text-gray-900 font-semibold">{selectedPkg.name} — {selectedPkg.credits} Scan Credits</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-sans text-[11px]">Amount Paid</span>
                    <span className="font-bold text-gray-900 text-sm">
                      ₱{receiptAmount.toLocaleString('en-PH')}.00
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-sans text-[11px]">Payment Method</span>
                    <span className="text-gray-800">Card •••• {receiptLast4 || "4242"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-sans text-[11px]">Status</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full text-[10px] font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Completed
                    </span>
                  </div>

                  <div className="h-px bg-gray-200 my-2" />

                  <div className="flex items-center justify-between font-sans">
                    <span className="text-gray-600 text-xs">New balance:</span>
                    <span className="font-bold mono text-blue-700 text-sm">
                      {creditBalance !== null ? creditBalance : purchasedCredits} Scan Credits
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="w-full flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-600">
                      <polyline points="6 9 6 2 18 2 18 9"/>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                      <rect x="6" y="14" width="12" height="8"/>
                    </svg>
                    Print Receipt
                  </button>
                  <button
                    type="button"
                    onClick={closeBuyCreditsModal}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs text-white shadow-sm transition-all hover:opacity-90 flex items-center justify-center cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${B}, ${BH})` }}
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
  );
}
