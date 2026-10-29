export const categoryColors = {
  objectives: { label: 'Context Alignment', color: '#f59e0b', tint: '#fef3c7', ink: '#78350f', description: 'Drifts from what the paper sets out to do' },
  methodology: { label: 'Operational Alignment', color: '#10b981', tint: '#d1fae5', ink: '#064e3b', description: 'How the work was done does not match' },
  claims: { label: 'Logical Support', color: '#f43f5e', tint: '#ffe4e6', ink: '#881337', description: 'Statement needs stronger support' },
  numeric: { label: 'Evidence Consistency', color: '#3b82f6', tint: '#dbeafe', ink: '#1e3a8a', description: 'Numbers or data do not agree' },
} as const;

export type RecommendationCategory = keyof typeof categoryColors;

export const neutralHighlight = { color: '#be123c', tint: '#fde2e4', ink: '#9f1239' };

export function recommendationCategory(value: unknown): RecommendationCategory | undefined {
  return typeof value === 'string' && value in categoryColors ? value as RecommendationCategory : undefined;
}
