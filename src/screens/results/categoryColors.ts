export const categoryColors = {
  objectives: { label: 'Objectives', color: '#f59e0b', tint: '#fef3c7', ink: '#78350f', description: 'Does not support the stated aims' },
  methodology: { label: 'Methodology', color: '#10b981', tint: '#d1fae5', ink: '#064e3b', description: 'Method does not fit the study' },
  claims: { label: 'Claims', color: '#f43f5e', tint: '#ffe4e6', ink: '#881337', description: 'Claim needs stronger support' },
  numeric: { label: 'Numeric', color: '#3b82f6', tint: '#dbeafe', ink: '#1e3a8a', description: 'Figures do not agree' },
} as const;

export type RecommendationCategory = keyof typeof categoryColors;

export const neutralHighlight = { color: '#be123c', tint: '#fde2e4', ink: '#9f1239' };

export function recommendationCategory(value: unknown): RecommendationCategory | undefined {
  return typeof value === 'string' && value in categoryColors ? value as RecommendationCategory : undefined;
}
