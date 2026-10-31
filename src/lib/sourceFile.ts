// The uploaded Word file stays in the student's own browser (IndexedDB) so a report can show their manuscript exactly
// as written, even after a reload. It is never sent anywhere for this: the scan upload is a separate request.

const DB_NAME = 'resync-source-files';
const STORE = 'files';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      request.result.createObjectStore('saved');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSourceFile(scanId: string, file: File): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE, 'saved'], 'readwrite');
      const files = tx.objectStore(STORE);
      const saved = tx.objectStore('saved');
      const keys = files.getAllKeys();
      const savedKeys = saved.getAllKeys();
      const savedTimes = saved.getAll();
      let ready = 0;
      const prune = () => {
        if (++ready !== 3) return;
        const times = new Map(savedKeys.result.map((key, index) => [String(key), Number(savedTimes.result[index])]));
        const keep = keys.result.map(String).filter(key => key !== scanId)
          .sort((a, b) => (times.get(b) ?? 0) - (times.get(a) ?? 0) || b.localeCompare(a)).slice(0, 9);
        for (const key of keys.result.map(String)) if (key !== scanId && !keep.includes(key)) { files.delete(key); saved.delete(key); }
        files.put(file, scanId);
        saved.put(Date.now(), scanId);
      };
      keys.onsuccess = prune;
      savedKeys.onsuccess = prune;
      savedTimes.onsuccess = prune;
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
