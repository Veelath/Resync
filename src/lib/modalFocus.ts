export function modalTabTarget(index: number, count: number, backwards: boolean): number | null {
  if (!count) return -1;
  if (index < 0) return backwards ? count - 1 : 0;
  if (backwards && index === 0) return count - 1;
  if (!backwards && index === count - 1) return 0;
  return null;
}
