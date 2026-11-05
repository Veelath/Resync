import { purchaseCredits } from '../services/api';

export type ProofMethod = 'gcash' | 'bank_transfer';
export const PROOF_METHOD_LABEL: Record<ProofMethod, string> = { gcash: 'GCash', bank_transfer: 'Bank transfer' };
export const PROOF_MAX_BYTES = 2 * 1024 * 1024;
export const PROOF_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

/** What the person typed and picked on the "upload proof of payment" form. */
export interface ProofPayment { method: ProofMethod; referenceNumber: string; payerName: string; file: File | null }

/** A plain-language problem with the form, or null when it can be sent. */
export function validateProof(method: ProofMethod | '', referenceNumber: string, payerName: string, file: File | null): string | null {
  // While no payment provider confirms the money, every detail is optional: whatever is filled in is kept with the purchase.
  if (!method) return 'Choose how you paid.';
  if (payerName.trim().length > 120) return 'That name is too long.';
  if (referenceNumber.trim() && !/^[A-Za-z0-9 -]{1,40}$/.test(referenceNumber.trim())) return 'The reference number can only have letters, numbers, spaces and dashes.';
  if (file && !PROOF_TYPES.includes(file.type)) return 'Upload a PNG, JPEG, WebP or PDF file.';
  if (file && file.size > PROOF_MAX_BYTES) return 'That file is larger than 2 MB. Please choose a smaller one.';
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

/** Buy the package with the receipt attached. The server saves the proof and adds the credits together, or does neither. */
export async function payWithProof(userId: string, pkg: { credits: number }, proof: ProofPayment) {
  // A receipt is attached only when one was chosen; the purchase itself never waits on it.
  const reference = proof.referenceNumber.trim().padEnd(4, '-');
  const result = await purchaseCredits(userId, pkg.credits, proof.method, proof.file ? {
    reference_number: reference, payer_name: proof.payerName.trim() || undefined, file_name: proof.file.name,
    content_type: proof.file.type, proof_data: await toBase64(proof.file),
  } : undefined);
  return { checkout: result, balance: result.balance };
}
