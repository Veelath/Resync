// The student's own Word file (or the Google Doc downloaded as Word), kept in this tab's memory only so the report can show the manuscript
// exactly as it was uploaded. It is never sent anywhere again, never written to storage, and is dropped when the report is left, when a new
// scan starts, on sign-out, or when the tab closes.
let held: { file: File; scanId: string | null } | null = null;

export function keepManuscriptFile(file: File | null | undefined): void {
  held = file ? { file, scanId: null } : null;
}

/** Ties the kept file to the scan it was sent for, so a report never shows another document. */
export function tagManuscriptFile(scanId: string): void {
  if (held && held.scanId === null) held = { file: held.file, scanId };
}

export function manuscriptFileFor(scanId: string | null | undefined): File | null {
  return held && scanId && held.scanId === scanId ? held.file : null;
}

export function dropManuscriptFile(): void {
  held = null;
}
