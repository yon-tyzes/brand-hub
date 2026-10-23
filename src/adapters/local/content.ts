// `local` content adapter (browser side). Talks to the dev-only endpoint, which writes brands/<slug>/ on
// disk. It refuses to run outside `astro dev`: production builds need a server-backed adapter.
import { AdapterError, ConflictError, type BrandContent, type ChangeSet, type ContentAdapter, type RevisionReader } from "../types.ts";

const API = "/admin/api/local";

function devOnly(): void {
  if (!import.meta.env.DEV) {
    throw new AdapterError("This editor is set up for local development only. Ask whoever runs the site to connect saving.");
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  devOnly();
  let res: Response;
  try {
    res = await fetch(`${API}/${path}`, init);
  } catch {
    throw new AdapterError("The editor could not reach the dev server. Check that it is still running.");
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 409) throw new ConflictError(body as { revision: string; data: BrandContent });
  if (!res.ok) throw new AdapterError((body as { message?: string }).message ?? "The dev server could not finish this.");
  return body as T;
}

const content: ContentAdapter & RevisionReader = {
  loadDraft: () => call("draft"),
  async saveDraft(changes: ChangeSet) {
    const form = new FormData();
    const upserts = changes.upserts.map((u, i) => {
      if (typeof u.content === "string") return { path: u.path, text: u.content };
      form.append(`file-${i}`, u.content);
      return { path: u.path, field: `file-${i}` };
    });
    form.append("changes", JSON.stringify({ base: changes.base, upserts, deletes: changes.deletes, summary: changes.summary }));
    return call("save", { method: "POST", body: form });
  },
  publish: () => call("publish", { method: "POST" }),
  async discardDraft() {
    throw new AdapterError("With the local adapter, discard changes with git.");
  },
  history: (limit) => call(`history?limit=${limit}`),
  async loadRevision(revision) {
    const r = await call<{ revision: string; data: BrandContent; files: Record<string, string> }>(`revision?rev=${encodeURIComponent(revision)}`);
    const files: Record<string, Blob> = {};
    for (const [path, b64] of Object.entries(r.files)) files[path] = new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))]);
    return { revision: r.revision, data: r.data, files };
  },
};

export default content;
