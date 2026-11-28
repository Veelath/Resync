// The uploaded file stays in memory and, when small enough, in this tab for refreshes. A file too large for the tab is
// kept there without its pictures, so after a refresh the report still shows the document's own pages, text and tables.
import { slimDocx } from './slimDocx';

let held: { file: File; scanId: string | null } | null = null;
let revision = 0;
const KEY = 'resync-manuscript-copy';
const MAX_STORED_BYTES = 4 * 1024 * 1024;

// Remove copies saved by earlier versions, including when no report is opened.
try { indexedDB.deleteDatabase(KEY); } catch { /* IndexedDB may be unavailable. */ }

export function manuscriptFits(encoded: string): boolean {
  return encoded.length * 2 <= MAX_STORED_BYTES;
}

async function writeStored(value: typeof held): Promise<void> {
  const current = ++revision;
  try {
    sessionStorage.removeItem(KEY);
    if (!value) return;
    let file = value.file;
    if (file.size * 8 / 3 > MAX_STORED_BYTES && /\.docx$/i.test(file.name)) file = await slimDocx(file, true);
    if (file.size > MAX_STORED_BYTES || current !== revision) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const encoded = JSON.stringify({ data: btoa(binary), name: value.file.name, type: value.file.type, scanId: value.scanId });
    if (current === revision && manuscriptFits(encoded)) sessionStorage.setItem(KEY, encoded);
  } catch { /* storage unavailable: the copy lives in memory only */ }
}

function readStored(): typeof held {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (typeof value.data !== 'string' || typeof value.name !== 'string' || typeof value.type !== 'string' || typeof value.scanId !== 'string') return null;
    const bytes = Uint8Array.from(atob(value.data), char => char.charCodeAt(0));
    return { file: new File([bytes], value.name, { type: value.type }), scanId: value.scanId };
  } catch { return null; }
}

export function keepManuscriptFile(file: File | null | undefined): void {
  held = file ? { file, scanId: null } : null;
  void writeStored(held);
}

/** Ties the kept file to the scan it was sent for, so a report never shows another document. */
export function tagManuscriptFile(scanId: string): void {
  if (held && held.scanId === null) { held = { file: held.file, scanId }; void writeStored(held); }
}

export function manuscriptFileFor(scanId: string | null | undefined): File | null {
  return held && scanId && held.scanId === scanId ? held.file : null;
}

/** The kept file after a refresh, only returned for the scan it belongs to. */
export async function loadManuscriptFile(scanId: string | null | undefined): Promise<File | null> {
  const live = manuscriptFileFor(scanId);
  if (live || !scanId) return live;
  const stored = readStored();
  if (!stored || stored.scanId !== scanId) return null;
  held = stored;
  return stored.file;
}

export function dropManuscriptFile(): void {
  held = null;
  void writeStored(null);
}
