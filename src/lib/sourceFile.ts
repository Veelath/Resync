// The uploaded Word file stays in the student's own browser (IndexedDB) so a report can show their manuscript exactly
// as written, even after a reload. It is never sent anywhere for this: the scan upload is a separate request.

const DB_NAME = 'resync-source-files';
const STORE = 'files';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSourceFile(scanId: string, file: File): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(file, scanId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* private mode or storage full: the report still works with the plain text view */ }
}

export async function loadSourceFile(scanId: string): Promise<File | null> {
  try {
    const db = await open();
    const file = await new Promise<File | null>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(scanId);
      request.onsuccess = () => resolve((request.result as File | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return file;
  } catch {
    return null;
  }
}
