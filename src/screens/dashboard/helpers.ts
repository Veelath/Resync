export function parseUserProfileMetadata(meta?: Record<string, any> | null, email?: string | null) {
  const rawFullName = meta?.full_name || email?.split('@')[0] || 'User';
  let firstName = meta?.first_name || '';
  const middleName = meta?.middle_name || '';
  let lastName = meta?.last_name || '';

  // Heuristic: If first_name missing but full_name present, split heuristically (first word = first_name, rest = last_name)
  if (!firstName && rawFullName) {
    const parts = rawFullName.trim().split(/\s+/).filter(Boolean);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  const fullName = meta?.full_name || [firstName, middleName, lastName].filter(Boolean).join(' ') || rawFullName;
  return { firstName, middleName, lastName, fullName };
}

export const CREDIT_PACKAGES = [
  {
    id: "quick",
    name: "Quick Scan",
    credits: 1,
    price: 25,
    unitPrice: 25,
    perCredit: "₱25.00 / credit",
    subtitle: "One manuscript, one check",
    badge: null,
  },
  {
    id: "starter",
    name: "Starter",
    credits: 5,
    price: 125,
    unitPrice: 25,
    perCredit: "₱25.00 / credit",
    subtitle: "Small batch of revisions",
    badge: null,
  },
  {
    id: "standard",
    name: "Standard",
    credits: 20,
    price: 450,
    unitPrice: 22.5,        // ₱22.50 × 20 = ₱450 (10% off)
    perCredit: "₱22.50 / credit",
    subtitle: "Full defense preparation",
    badge: "10% OFF",
    recommended: true,
  },
  {
    id: "team",
    name: "Research Team",
    credits: 50,
    price: 1000,
    unitPrice: 20,          // ₱20 × 50 = ₱1,000 (20% off)
    perCredit: "₱20.00 / credit",
    subtitle: "Multi-author or lab use",
    badge: "20% OFF",
  },
] as const;

