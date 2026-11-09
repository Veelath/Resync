// Clear Word files saved by earlier versions on sign-out.

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

export async function clearAllSourceFiles(): Promise<void> {
  try {
    const db = await open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(Array.from(db.objectStoreNames), 'readwrite');
        for (const name of Array.from(db.objectStoreNames)) tx.objectStore(name).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  } catch { /* IndexedDB may be unavailable. */ }
}
