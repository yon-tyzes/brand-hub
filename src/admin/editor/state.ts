// Editor state: the base snapshot, the working draft, and undo/redo history.
// Every edit is a pure function from one draft to the next, so undo is restoring the previous draft.
import type { AnyRecord, Status } from "../../../schemas/asset.ts";
import type { BrandContent } from "../../adapters/types.ts";

export interface StoredFile {
  /** Provisional path in the brand folder (files/<module>/<name>). The serializer may rename it. */
  path: string;
  /** Original file name, for display. */
  name: string;
  type: string;
  blob: Blob;
  width?: number;
  height?: number;
}

export interface Draft {
  records: AnyRecord[];
  /** Files uploaded in this session, by path. */
  files: Record<string, StoredFile>;
}

export interface EditorState {
  revision: string;
  base: BrandContent;
  present: Draft;
  past: Draft[];
  future: Draft[];
  /** Consecutive edits with the same key (typing in one field) merge into one undo step. */
  lastKey?: string;
  lastAt?: number;
}

export type Edit = (d: Draft) => Draft;

export type EditorAction =
  | { type: "apply"; edit: Edit; key?: string; now?: number }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "load"; revision: string; base: BrandContent; present?: Draft };

const HISTORY_LIMIT = 200;
const MERGE_MS = 1200;

export function initialState(revision: string, base: BrandContent, present?: Draft): EditorState {
  return { revision, base, present: present ?? { records: base.records, files: {} }, past: [], future: [] };
}

export function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "load":
      return initialState(action.revision, action.base, action.present);
    case "apply": {
      const next = action.edit(state.present);
      if (next === state.present) return state;
      const now = action.now ?? Date.now();
      const merge = action.key !== undefined && action.key === state.lastKey && now - (state.lastAt ?? 0) < MERGE_MS;
      return {
        ...state,
        present: next,
        past: merge ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT),
        future: [],
        lastKey: action.key,
        lastAt: now,
      };
    }
    case "undo": {
      const prev = state.past.at(-1);
      if (!prev) return state;
      return { ...state, present: prev, past: state.past.slice(0, -1), future: [state.present, ...state.future], lastKey: undefined };
    }
    case "redo": {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return { ...state, present: next, past: [...state.past, state.present], future: rest, lastKey: undefined };
    }
  }
}

// ---------- Edits ----------

const mapRecords = (d: Draft, fn: (r: AnyRecord) => AnyRecord): Draft => {
  let changed = false;
  const records = d.records.map((r) => {
    const n = fn(r);
    if (n !== r) changed = true;
    return n;
  });
  return changed ? { ...d, records } : d;
};

export const addRecord = (record: AnyRecord, files: StoredFile[] = []): Edit => (d) => ({
  records: [...d.records, { ...record, order: record.order ?? nextOrder(d.records, record.type) }],
  files: { ...d.files, ...Object.fromEntries(files.map((f) => [f.path, f])) },
});

export const updateRecord = (id: string, patch: Partial<AnyRecord>): Edit => (d) =>
  mapRecords(d, (r) => (r.id === id ? ({ ...r, ...patch } as AnyRecord) : r));

export const setStatus = (ids: string[], status: Status): Edit => (d) =>
  mapRecords(d, (r) => (ids.includes(r.id) && r.status !== status ? ({ ...r, status } as AnyRecord) : r));

export const retire = (ids: string[]): Edit => setStatus(ids, "retired");

/** Removes a record for good. Its files leave the brand folder when the change set is applied. */
export const deleteRecord = (id: string): Edit => (d) => ({ ...d, records: d.records.filter((r) => r.id !== id) });

/** Adds uploaded files and points a record at them in one step (Replace file). */
export const attachFiles = (id: string, files: StoredFile[], patch: Partial<AnyRecord>): Edit => (d) => ({
  records: d.records.map((r) => (r.id === id ? ({ ...r, ...patch } as AnyRecord) : r)),
  files: { ...d.files, ...Object.fromEntries(files.map((f) => [f.path, f])) },
});

/** Display order within a type: `order`, then label (same as the public site). */
export function ordered(records: AnyRecord[], type: AnyRecord["type"]): AnyRecord[] {
  return records
    .filter((r) => r.type === type)
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.label.localeCompare(b.label));
}

function nextOrder(records: AnyRecord[], type: AnyRecord["type"]): number {
  return Math.max(0, ...records.filter((r) => r.type === type).map((r) => r.order ?? 0)) + 1;
}

/** Writes order 1..n for a type in the given id order. */
export const reorder = (type: AnyRecord["type"], ids: string[]): Edit => (d) => {
  const pos = new Map(ids.map((id, i) => [id, i + 1]));
  return mapRecords(d, (r) => (r.type === type && pos.has(r.id) && r.order !== pos.get(r.id) ? ({ ...r, order: pos.get(r.id) } as AnyRecord) : r));
};

/** Moves one record up (-1) or down (+1) within its type. */
export const moveBy = (id: string, delta: -1 | 1): Edit => (d) => {
  const rec = d.records.find((r) => r.id === id);
  if (!rec) return d;
  const ids = ordered(d.records, rec.type).map((r) => r.id);
  const i = ids.indexOf(id);
  const j = i + delta;
  if (j < 0 || j >= ids.length) return d;
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  return reorder(rec.type, ids)(d);
};
