// The student's own Word file (or the Google Doc downloaded as Word), kept ONLY in this browser so the report can show the manuscript
// exactly as it was uploaded. It is never sent anywhere again. It is held in memory, and also in this browser's own storage so a refresh
// of the report page does not lose it; it is dropped when the report is left, when a new scan starts, on sign-out, or when the next
// visit finds a report that was never left properly.
let held: { file: File; scanId: string | null } | null = null;

const DB_NAME = 'resync-manuscript-copy';
const STORE = 'copy';
const KEY = 'current';

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeStored(value: { file: File; scanId: string | null } | null): Promise<void> {
  try {
    const db = await openStore();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        if (value) tx.objectStore(STORE).put(value, KEY); else tx.objectStore(STORE).delete(KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  } catch { /* storage unavailable: the copy then lives in memory only */ }
}

async function readStored(): Promise<{ file: File; scanId: string | null } | null> {
  try {
    const db = await openStore();
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
        request.onsuccess = () => resolve((request.result as { file: File; scanId: string | null } | undefined) ?? null);
        request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
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

/** The kept file after a refresh, when memory is empty. Only returned for the scan it belongs to. */
export async function loadManuscriptFile(scanId: string | null | undefined): Promise<File | null> {
  const live = manuscriptFileFor(scanId);
  if (live || !scanId) return live;
  const stored = await readStored();
  if (!stored || stored.scanId !== scanId) return null;
  held = stored;
  return stored.file;
}

export function dropManuscriptFile(): void {
  held = null;
  void writeStored(null);
}
