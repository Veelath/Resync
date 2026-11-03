import { createCreditCheckout, confirmCreditCheckout, uploadPaymentProof } from '../services/api';

export type ProofMethod = 'gcash' | 'bank_transfer';
export const PROOF_METHOD_LABEL: Record<ProofMethod, string> = { gcash: 'GCash', bank_transfer: 'Bank transfer' };
export const PROOF_MAX_BYTES = 2 * 1024 * 1024;
export const PROOF_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

/** What the person typed and picked on the "upload proof of payment" form. */
export interface ProofPayment { method: ProofMethod; referenceNumber: string; payerName: string; file: File }

/** A plain-language problem with the form, or null when it can be sent. */
export function validateProof(method: ProofMethod | '', referenceNumber: string, payerName: string, file: File | null): string | null {
  if (!method) return 'Choose how you paid.';
  if (!payerName.trim()) return 'Enter the name on your GCash or bank account.';
  if (!/^[A-Za-z0-9 -]{4,40}$/.test(referenceNumber.trim())) return 'Enter the reference number from your receipt (letters and numbers, at least 4).';
  if (!file) return 'Upload a screenshot or PDF of your receipt.';
  if (!PROOF_TYPES.includes(file.type)) return 'Upload a PNG, JPEG, WebP or PDF file.';
  if (file.size > PROOF_MAX_BYTES) return 'That file is larger than 2 MB. Please choose a smaller one.';
  return null;
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('We could not read that file. Please try another one.'));
    reader.readAsDataURL(file);
  });
}

/** Tells the app a payment went through, so it can show the payment notification wherever the person paid. */
export const PAYMENT_EVENT = 'resync:payment';
export function announcePayment(credits: number, amount: number) {
  window.dispatchEvent(new CustomEvent(PAYMENT_EVENT, { detail: { credits, amount } }));
}

/** Start the purchase, send the proof, then confirm it. The balance is only credited after the proof is saved. */
export async function payWithProof(userId: string, pkg: { credits: number; unitPrice: number }, proof: ProofPayment) {
  const checkout = await createCreditCheckout(userId, pkg.credits, pkg.unitPrice);
  await uploadPaymentProof(userId, {
    pymt_txn_id: checkout.pymt_txn_id, method: proof.method, reference_number: proof.referenceNumber.trim(),
    payer_name: proof.payerName.trim(), file_name: proof.file.name, content_type: proof.file.type, proof_data: await toBase64(proof.file),
  });
  const confirmation = await confirmCreditCheckout(userId, checkout.pymt_txn_id);
  return { checkout, balance: confirmation.balance };
}
