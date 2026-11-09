export function shouldRetryWordView(wasLocked: boolean, locked: boolean): boolean {
  return wasLocked && !locked;
}
