// `demo` content adapter: in memory, resets on reload. Lets visitors of the public demo try the editor on a
// static build with no server. It reads the build-time snapshot at /admin/data.json.
import type { AnyRecord } from "../../../schemas/asset.ts";
import type { ChangelogEntry } from "../../../schemas/changelog.ts";
import type { BrandContent, ChangeSet, ContentAdapter, RevisionReader, Session } from "../types.ts";

interface Snapshot {
  revision: string;
  data: BrandContent;
  files: Record<string, Blob>;
}

let current: Snapshot | null = null;
const snapshots: Snapshot[] = [];
const log: { revision: string; date: string; author: string; summary: string[] }[] = [];
let counter = 0;

async function apply(base: Snapshot, changes: ChangeSet): Promise<Snapshot> {
  const root = `brands/${base.data.slug}/`;
  const files = { ...base.files };
  let records = [...base.data.records];
  const sources = { ...base.data.sources };
  let changelog: ChangelogEntry[] = base.data.changelog;
  let brand = base.data.brand;
  const svgs = { ...base.data.svgs };
  for (const u of changes.upserts) {
    const path = u.path.slice(root.length);
    if (path.startsWith("files/")) {
      const blob = typeof u.content === "string" ? new Blob([u.content]) : u.content;
      files[path] = blob;
      if (path.endsWith(".svg")) svgs[path] = await blob.text();
      continue;
    }
    const parsed = JSON.parse(typeof u.content === "string" ? u.content : await u.content.text());
    if (path === "changelog.json") {
      changelog = parsed;
      continue;
    }
    if (path === "brand.json") {
      brand = parsed;
      continue;
    }
    // A data file holds the full list of its records: replace them.
    records = records.filter((r) => sources[r.id] !== path);
    for (const r of parsed as AnyRecord[]) {
      records.push(r);
      sources[r.id] = path;
    }
  }
  for (const d of changes.deletes) delete files[d.slice(root.length)];
  for (const id of Object.keys(sources)) if (!records.some((r) => r.id === id)) delete sources[id];
  return { revision: `demo-${++counter}`, data: { ...base.data, brand, records, sources, changelog, svgs }, files };
}

const content: ContentAdapter & RevisionReader = {
  async loadDraft() {
    if (current) return { revision: current.revision, data: current.data };
    const res = await fetch("/admin/data.json");
    if (!res.ok) return null;
    const loaded = (await res.json()) as { revision: string; data: BrandContent };
    current = { ...loaded, files: {} };
    snapshots.push(current);
    return loaded;
  },
  async saveDraft(changes, session: Session) {
    if (!current) throw new Error("Nothing loaded");
    current = await apply(current, changes);
    snapshots.push(current);
    log.unshift({ revision: current.revision, date: new Date().toISOString(), author: session.name, summary: changes.summary });
    return { revision: current.revision };
  },
  async publish(session) {
    if (!current) throw new Error("Nothing loaded");
    log.unshift({ revision: current.revision, date: new Date().toISOString(), author: session.name, summary: ["Published"] });
    return { revision: current.revision };
  },
  async discardDraft() {
    const first = snapshots[0];
    if (first) current = first;
  },
  history: async (limit) => log.slice(0, limit),
  async loadRevision(revision) {
    const s = snapshots.find((x) => x.revision === revision);
    if (!s) throw new Error("That version is no longer in memory.");
    return { revision: s.revision, data: s.data, files: s.files };
  },
};

export default content;
