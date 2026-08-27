import React, { useState } from 'react';
import { X, Loader2, CreditCard, ShieldAlert } from 'lucide-react';
import { createCreditCheckout, confirmCreditCheckout } from '../services/api.js';

export default function TopUpModal({
  userId,
  onClose,
  onSuccess,
}: {
  userId?: string;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(1);
  const [error, setError] = useState('');
  const costPerCredit = 25.0;

  const handlePay = async () => {
    if (!userId) {
      setError('You must be logged in to purchase credits.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Real ledger writes on the backend (credit_wallet / credit_ledger),
      // but the "payment" step itself is simulated for this capstone demo —
      // no live GCash/PayMongo charge actually happens. confirm_checkout is
      // the exact seam a real payment webhook would occupy instead.
      const checkout = await createCreditCheckout(userId, amount);
      const confirmed = await confirmCreditCheckout(userId, checkout.pymt_txn_id);
      onSuccess(confirmed.balance);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process the credit purchase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-8 relative space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Top Up Credits</h2>
          <p className="text-sm text-slate-500 mt-2">Purchase scan credits to continue analyzing your manuscripts. 1 Credit = ₱25.00</p>
        </div>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg text-left">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Simulated payment (capstone demo) — credits are added to a real ledger, but no live GCash/card charge occurs.</span>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-800 text-xs p-3 rounded-lg border border-rose-100 text-left">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-700">Credits to buy</div>
            <div className="flex items-center gap-4">
              <button onClick={() => setAmount(Math.max(1, amount - 1))} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold hover:bg-slate-300 cursor-pointer">-</button>
              <span className="font-bold w-4 text-center">{amount}</span>
              <button onClick={() => setAmount(Math.min(100, amount + 1))} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold hover:bg-slate-300 cursor-pointer">+</button>
            </div>
          </div>
          <div className="flex justify-between items-center px-2 font-bold text-lg text-slate-800">
            <span>Total:</span>
            <span>₱{(amount * costPerCredit).toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={handlePay}
          disabled={loading || !userId}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <span>Pay with GCash</span>
          )}
        </button>
      </div>
    </div>
  );
}
