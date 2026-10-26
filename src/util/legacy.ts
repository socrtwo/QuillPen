/**
 * Anne's Pen was formerly named QuillForge. On the first start after the rename this copies the
 * browser-side data stored under the old names to the new ones, so settings, drafts, version
 * snapshots, dictionaries and AI settings carry over. Imported first by main.ts so it runs before
 * any module reads localStorage. The old entries are left in place (nothing is deleted).
 */
const OLD = 'quillforge'; // rename:keep
const NEW = 'quillpen';
const DONE = NEW + '.legacyMigrated';

function migrateLocalStorage(): void {
  try {
    if (localStorage.getItem(DONE)) return;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(OLD + '.')) continue;
      const nk = NEW + k.slice(OLD.length);
      if (localStorage.getItem(nk) == null) localStorage.setItem(nk, localStorage.getItem(k) ?? '');
    }
    localStorage.setItem(DONE, String(Date.now()));
  } catch { /* storage unavailable */ }
}

/** Copies every entry of the old IndexedDB key-value store into the new one (store.ts calls this once). */
export async function migrateIndexedDb(newDb: IDBDatabase, store: string): Promise<void> {
  const flag = NEW + '.idbMigrated';
  try { if (localStorage.getItem(flag)) return; } catch { return; }
  const old = await new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(OLD);
      // A database that did not exist would be created here: abort so nothing is left behind.
      req.onupgradeneeded = () => { req.transaction?.abort(); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  if (old) {
    try {
      if (old.objectStoreNames.contains(store)) {
        const entries = await new Promise<[IDBValidKey, unknown][]>((resolve) => {
          const out: [IDBValidKey, unknown][] = [];
          const cur = old.transaction(store).objectStore(store).openCursor();
          cur.onsuccess = () => { const c = cur.result; if (c) { out.push([c.key, c.value]); c.continue(); } else resolve(out); };
          cur.onerror = () => resolve(out);
        });
        await new Promise<void>((resolve) => {
          const tx = newDb.transaction(store, 'readwrite');
          const os = tx.objectStore(store);
          for (const [k, v] of entries) {
            const g = os.get(k);
            g.onsuccess = () => { if (g.result === undefined) os.put(v, k); };
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
        });
      }
    } finally { old.close(); }
  }
  try { localStorage.setItem(flag, String(Date.now())); } catch { /* */ }
}

migrateLocalStorage();
