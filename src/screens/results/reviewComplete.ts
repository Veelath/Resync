export function reviewUnfinished(review?: { status: string; unreviewed: number }): boolean {
  return !!review && (review.status === 'partial' || review.status === 'daily_limit' || review.unreviewed > 0);
}
