# Adapters

The editor at `/admin` never reads or writes brand files itself. It talks to two adapters:

- `AuthAdapter` answers who is editing.
- `ContentAdapter` loads the brand, saves drafts, publishes, and lists history.

The engine defines both interfaces and ships two implementations, `local` and `demo`. An instance that edits a real brand implements its own, usually backed by its git host. This document covers the contract, how the editor calls it, and a reference outline for a git-hosting adapter.

Source of truth for the types: `src/adapters/types.ts`. The interfaces match `docs/ENGINE_SPEC.md`, section 8.

## Where adapters run

Adapters are browser code. The integration resolves the modules named in `hub.config.ts` and bundles them into the editor through the `virtual:brand-hub/admin` module. Anything an adapter module imports ships to every editor visitor.

So an instance adapter is a thin client. It calls the instance's own server functions over HTTPS, and those functions hold the credentials, check the session, and talk to the git host. Credentials never appear in the adapter module, in `hub.config.ts`, or anywhere the engine can read them.

```
browser                                   instance server functions          git host
editor ──► ContentAdapter (fetch) ──────► verify session, apply change ────► one commit
       ──► AuthAdapter    (fetch) ──────► session cookie                     (token stays here)
```

## Choosing adapters

`admin.adapter` and `admin.auth` in `hub.config.ts` take a built-in name (`"local"` or `"demo"`) or a path to a module, relative to the project root. The module's default export is the adapter. Either field can differ between `astro dev` and `astro build`:

```ts
export default defineHub({
  brand: "example",
  modules: ["logos", "colors", "fonts", "icons"],
  admin: {
    enabled: true,
    adapter: { dev: "local", build: "./adapters/git-content.ts" },
    auth: { dev: "local", build: "./adapters/session-auth.ts" },
  },
});
```

Both fields default to `"local"`. A build that still uses `local` logs a warning, because the built editor cannot load or save with it.

Import the types and error classes from `@yon-tyzes/brand-hub/adapters`.

## The interfaces

```ts
interface Session { userId: string; name: string; email: string; role: "editor" | "publisher"; }

interface AuthAdapter {
  getSession(): Promise<Session | null>;
  signIn(returnTo?: string): Promise<void>;
  signOut(): Promise<void>;
}

interface ChangeSet {
  base: string;                                // revision the edits started from
  upserts: { path: string; content: string | Blob }[];
  deletes: string[];
  summary: string[];                           // changelog lines
}

interface ContentAdapter {
  loadDraft(): Promise<{ revision: string; data: BrandContent } | null>;
  saveDraft(changes: ChangeSet, session: Session): Promise<{ revision: string; previewUrl?: string }>;
  publish(session: Session): Promise<{ revision: string }>;
  discardDraft(session: Session): Promise<void>;
  history(limit: number): Promise<{ revision: string; date: string; author: string; summary: string[] }[]>;
}
```

### AuthAdapter

- `getSession()` returns the signed-in person, or `null`. With `null` the editor shows "Sign in to edit the brand." and loads nothing.
- `signIn(returnTo)` starts the instance's sign-in flow, typically a redirect to an identity provider, and comes back to `returnTo`.
- `role` is passed through to `saveDraft` and `publish`. The editor does not gate any button on it, so the server must enforce roles itself: refuse a publish from an `editor`.

### ContentAdapter

- **Revisions are opaque strings.** The editor only compares them and passes them back. `local` uses a hash of the brand's data files, `demo` a counter, and a git adapter would use a commit id.
- **`loadDraft()`** returns the content the editor should start from: the draft if one exists, otherwise the published brand. `BrandContent` (in `types.ts`) holds the brand settings, every record including drafts and retired ones, the data file each record lives in, the changelog, and the markup of icon SVGs. Return `null` when there is nothing to load.
- **`saveDraft(changes, session)`** applies one change set and returns the new revision. Return `previewUrl` when the host builds a preview of the draft. The editor then offers a link to it.
- **`publish(session)`** makes the current draft live and returns the published revision. When the person has unsaved edits, the editor saves them first.
- **`discardDraft(session)`** drops the draft so the next `loadDraft()` returns the published brand.
- **`history(limit)`** lists recent versions, newest first. `summary` is the list of changelog lines shown under each entry.

### The change set

The serializer (`src/serializer/`) builds the change set and validates the whole resulting brand before the adapter sees anything. A change set that reaches `saveDraft` has already passed the loader rules, so the adapter does not need to re-validate it. A server that accepts writes from other clients should still run the engine's checks.

- Paths are relative to the project root and always start with `brands/<slug>/`. Refuse any other path on the server.
- Data files (`logos.json`, `colors.json`, `changelog.json`, and the rest) arrive whole as stable JSON strings: sorted keys, two-space indent, trailing newline. Write them byte for byte.
- Uploaded files arrive as `Blob`. Their names already follow the brand's naming pattern.
- `deletes` lists files no record points to any more.
- `summary` holds one line per visible change, for example `Logo, Horizontal logo: file replaced`. Use it as the commit message body.

## Errors the editor understands

`types.ts` exports two error classes. Throw them from adapter methods.

- **`ConflictError(remote)`**: the base revision moved. `remote` is `{ revision, data }` for the newer content. The editor lists the items that changed remotely and offers two choices. Reload keeps the person's edits on top of `remote`. Overwrite calls `saveDraft` again with `base` set to `remote.revision`, so the person's version of each file they changed replaces the newer one.
- **`AdapterError(message)`**: the editor shows `message` as is, with Try again. Write it for the person editing: what happened and what to do, without status codes.

The editor treats any other error as a network failure and shows a generic message with Try again. Unsaved work stays in the editor and in its autosave either way.

## Optional: restoring old versions

The History panel's Restore button needs to read an old revision, which `ContentAdapter` cannot do. An adapter that also implements `RevisionReader` gets the button:

```ts
interface RevisionReader {
  loadRevision(revision: string): Promise<{ revision: string; data: BrandContent; files?: Record<string, Blob> }>;
}
```

Return the brand as it was at `revision`. In `files`, include the content of any file that version uses and the current version no longer has. Restore loads the result as unsaved edits on top of the current revision. The person reviews it and saves it as a new draft, so nothing is rewritten.

## Built-in adapters

| Adapter | Where it runs | Behavior |
|---|---|---|
| `local` | `astro dev` only | Writes to `brands/<slug>/` through `/admin/api/local/*`, an endpoint the integration adds only under `astro dev`. Returns 409 when the files on disk changed since the editor loaded them. History and Restore come from `git log` on the brand folder. Publish and discard do nothing: commit or revert with git. The session is a fixed local editor. |
| `demo` | Static build, no server | Loads the build-time snapshot at `/admin/data.json` and keeps every change in memory. A reload resets it. The editor shows "Demo mode: changes are not saved." Used for the public demo deployment. |

The `local` endpoint and the `local` session both refuse to work outside `astro dev`. The `/admin/data.json` snapshot is built only when the build uses `demo`, because it contains every record, drafts included.

## Reference outline: git-hosting adapter

This outline shows one way to implement both interfaces for an instance whose brand lives in a git repository on a hosting service with an API. Drafts live on a `drafts` branch. `main` is what production builds. The host builds a preview deployment for the drafts branch.

### Server functions

Run these on the instance's host, next to the static site. Each one does the following before anything else:

1. Read the session from an HttpOnly cookie set at sign-in, and verify it. Ignore any session data in the request body. The `session` argument to `saveDraft` and `publish` is for the browser side; the server trusts only its own check.
2. Check the role: `editor` or `publisher` to save, `publisher` to publish or discard.
3. Use a token scoped to this one repository, read from the host's secret store.

| Function | Does |
|---|---|
| `GET /api/brand/session` | Returns the `Session` for the cookie, or 401. |
| `GET /api/brand/draft` | Reads the brand folder at the head of `drafts`, or of `main` when `drafts` does not exist. Returns `{ revision: <commit id>, data: BrandContent }`. |
| `POST /api/brand/save` | Receives the change set as multipart form data. Writes one commit to `drafts` (steps below). Returns `{ revision, previewUrl }`. |
| `POST /api/brand/publish` | Merges `drafts` into `main`. Returns `{ revision: <main commit id> }`. |
| `POST /api/brand/discard` | Points `drafts` back at `main`. |
| `GET /api/brand/history?limit=n` | Lists commits on `main` that touch `brands/<slug>/`. Maps each to `{ revision, date, author, summary }`, with the summary taken from the commit message body. |

To build `BrandContent` on the server, read the brand's JSON files and icon SVGs from the commit and run them through the engine's checks in `src/content/check.ts`. Those checks take a `BrandSource`, a read function over any storage, so they work on a git tree as well as on disk.

### Saving one commit

1. Validate every path: it starts with `brands/<slug>/` and resolves inside that folder.
2. Read the head of `drafts` (or `main` if `drafts` does not exist). If it differs from `changes.base`, answer 409 with the current `{ revision, data }`.
3. Create a blob for each upsert, base64 for binary files.
4. Create a tree on top of the base commit's tree. Add an entry for each upsert, and one with no content for each delete.
5. Create a commit with the base as its parent. Author is the session's name and email. The subject is short (for example `Update brand: 3 changes`) and the body is the summary lines.
6. Move `drafts` to the new commit without forcing. If the host rejects the update because the branch moved in the meantime, answer 409 as in step 2.

Everything above runs before the branch moves, so a failed save leaves no partial commit on `drafts`.

### Publishing

Merge `drafts` into `main`, preferably as a fast-forward. If `main` moved since the draft branched off and the merge conflicts, answer 409 with the current content of `main` so the editor can show the conflict. The host's production build runs on the push to `main`. Every publish is a commit, so rollback is a revert in git or a Restore in the editor.

### Browser side

The adapter modules are small. They wrap `fetch` and translate responses into what the editor expects:

```ts
import { AdapterError, ConflictError, type ContentAdapter } from "@yon-tyzes/brand-hub/adapters";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/brand/${path}`, { credentials: "same-origin", ...init });
  const body = await res.json().catch(() => ({}));
  if (res.status === 409) throw new ConflictError(body);
  if (res.status === 401) throw new AdapterError("Your sign-in expired. Sign in again; your changes are kept.");
  if (!res.ok) throw new AdapterError(body.message ?? "The server could not finish this. Try again in a moment.");
  return body as T;
}

const content: ContentAdapter = {
  loadDraft: () => call("draft"),
  saveDraft(changes) {
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
  discardDraft: () => call("discard", { method: "POST" }),
  history: (limit) => call(`history?limit=${limit}`),
};

export default content;
```

The auth module calls `/api/brand/session` in `getSession()`. `signIn()` and `signOut()` redirect to the instance's sign-in and sign-out routes.

### Credentials

- The repository token and any identity provider secrets live only in the host's secret store, and only server functions read them.
- The browser holds a session cookie (HttpOnly, Secure, SameSite=Lax) and nothing else.
- The engine never sees a credential. It calls the adapter, and the adapter calls the instance's own endpoints.
