// Autosave of the working draft in IndexedDB, so a refresh loses nothing. Every call tolerates storage
// being unavailable (private windows, blocked site data): the editor then works without autosave.
import type { AnyRecord } from "../../../schemas/asset.ts";
import type { Draft } from "./state.ts";

const DB = "brand-hub-editor";
const STORE = "drafts";

export interface SavedDraft {
  revision: string;
  draft: Draft;
  savedAt: string;
  /** Records the draft started from, so its edits can be replayed if the brand changed meanwhile. */
  baseRecords?: AnyRecord[];
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function loadSaved(key: string): Promise<SavedDraft | undefined> {
  try {
    return await run<SavedDraft | undefined>("readonly", (s) => s.get(key));
  } catch {
    return undefined;
  }
}

/** Returns false when storage is unavailable, so the UI can say autosave is off. */
export async function save(key: string, value: SavedDraft): Promise<boolean> {
  try {
    await run("readwrite", (s) => s.put(value, key));
    return true;
  } catch {
    return false;
  }
}

export async function clearSaved(key: string): Promise<void> {
  try {
    await run("readwrite", (s) => s.delete(key));
  } catch {
    // Nothing to clear.
  }
}
