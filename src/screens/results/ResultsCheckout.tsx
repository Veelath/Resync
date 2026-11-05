import { useState, type FormEvent } from 'react';
import { purchaseCredits } from '../../services/api';
import { CREDIT_PACKAGES } from '../dashboard/helpers';
import { PaymentModal } from '../dashboard/PaymentModal';
import { announcePayment, payWithProof, PROOF_METHOD_LABEL, type ProofPayment } from '../../lib/paymentProof';

export function ResultsCheckout({ userId, balance, onBalance, onClose }: { userId: string; balance: number | null; onBalance: (value: number) => void; onClose: () => void }) {
  const [step, setStep] = useState<'package' | 'payment' | 'processing' | 'success'>('package');
  const [packageId, setPackageId] = useState('quick');
  const selectedPkg = CREDIT_PACKAGES.find(pkg => pkg.id === packageId) ?? CREDIT_PACKAGES[0];
  const [receiptRef, setReceiptRef] = useState<string | null>(null);
  const [receiptTime, setReceiptTime] = useState<Date | null>(null);
  const [receiptLast4, setReceiptLast4] = useState('');
  const [receiptAmount, setReceiptAmount] = useState(0);
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [cardName, setCardName] = useState('Thesis Author');
  const [error, setError] = useState('');
  const [purchasedCredits, setPurchasedCredits] = useState(0);
  const [receiptMethod, setReceiptMethod] = useState<string | undefined>(undefined);

  async function handlePaymentSubmit(event: FormEvent) {
    event.preventDefault();
    const digits = cardNumber.replace(/\D/g, '');
    const expiry = cardExpiry.trim().match(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/);
    if (digits.length !== 16 || !expiry || !/^\d{3,4}$/.test(cardCvc) || !cardName.trim()) {
      setError('Check the card number, expiry, CVC, and cardholder name.');
      return;
    }
    setError('');
    setStep('processing');
    try {
      const checkout = await purchaseCredits(userId, selectedPkg.credits, 'card');
      onBalance(checkout.balance);
      setReceiptRef(checkout.checkout_reference);
      setReceiptTime(new Date());
      setReceiptLast4(digits.slice(-4));
      setReceiptAmount(checkout.amount);
      setPurchasedCredits(selectedPkg.credits);
      setReceiptMethod(undefined);
      setStep('success');
      announcePayment(selectedPkg.credits, checkout.amount);
    } catch (cause) {
      console.error('Checkout failed:', cause);
      setError(cause instanceof Error && cause.message ? cause.message : 'Your purchase could not be completed. No credits were added. Please try again.');
      setStep('payment');
    }
  }

  async function handleProofSubmit(proof: ProofPayment) {
    setError('');
    setStep('processing');
    try {
      const { checkout, balance: newBalance } = await payWithProof(userId, selectedPkg, proof);
      onBalance(newBalance);
      setReceiptRef(checkout.checkout_reference);
      setReceiptTime(new Date());
      setReceiptAmount(checkout.amount);
      setPurchasedCredits(selectedPkg.credits);
      setReceiptMethod(`${PROOF_METHOD_LABEL[proof.method]} · proof uploaded`);
      setStep('success');
      announcePayment(selectedPkg.credits, checkout.amount);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not save your proof of payment. Try again.');
      setStep('payment');
    }
  }

  return <PaymentModal receiptMethod={receiptMethod} handleProofSubmit={handleProofSubmit} creditBalance={balance} creditModalStep={step} setCreditModalStep={setStep} selectedPkgId={packageId} setSelectedPkgId={setPackageId}
    selectedPkg={selectedPkg} receiptRef={receiptRef} receiptTime={receiptTime} receiptLast4={receiptLast4} receiptAmount={receiptAmount}
    cardNumber={cardNumber} setCardNumber={setCardNumber} cardExpiry={cardExpiry} setCardExpiry={setCardExpiry} cardCvc={cardCvc} setCardCvc={setCardCvc}
    cardName={cardName} setCardName={setCardName} paymentError={error} setPaymentError={setError} purchasedCredits={purchasedCredits}
    closeBuyCreditsModal={onClose} handlePaymentSubmit={handlePaymentSubmit} returnLabel="Return to report" />;
}
