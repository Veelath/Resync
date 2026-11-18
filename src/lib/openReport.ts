// A report that is open in this browser. If the tab is closed or the connection drops, the report cannot be deleted on the spot, so its
// id is remembered here and deleted the next time Resync opens (unless that visit is to the same report, for example after a refresh).
const KEY = 'resync-open-report';

export function rememberOpenReport(id: string): void {
  try { localStorage.setItem(KEY, id); } catch { /* storage unavailable: the report is still deleted when it is left normally */ }
}

export function forgetOpenReport(): void {
  try { localStorage.removeItem(KEY); } catch { /* nothing to forget */ }
}

/** The id of a report left open by an earlier visit, or null when there is none or it is the report being opened now. */
export function leftoverReport(currentId: string | null): string | null {
  try {
    const id = localStorage.getItem(KEY);
    return id && id !== currentId ? id : null;
  } catch { return null; }
}

/** Deletes a report an earlier visit left open, then forgets it. Best effort. */
export async function discardLeftoverReport(currentId: string | null, discard: (id: string) => Promise<void | boolean>): Promise<void> {
  const id = leftoverReport(currentId);
  if (!id) return;
  if (await discard(id) !== false) forgetOpenReport();
}
