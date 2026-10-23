# Brand Hub engine specification

Version 0.1 draft. This document defines the engine: a static brand resource site plus an in-site editor, driven entirely by brand data. One engine serves many brands. Each brand lives in its own instance repo.

## 1. Goals

1. A team member finds and uses any brand asset in under 30 seconds, on desktop or phone.
2. A non-developer adds, edits, and removes assets inside the site, previews the result, and publishes it without touching code or JSON.
3. A new brand instance launches by adding data and files, not by changing engine code.
4. The public site stays fast on a weak mobile signal and meets WCAG 2.2 AA.

Non-goals for v1: user accounts for site visitors, a full DAM, file storage outside the repo, multi-language content.

## 2. Architecture

```
            ┌───────────────────────── engine (public repo) ─────────────────────────┐
            │                                                                         │
 brand data │  schemas ──► content loader ──► public site (static pages + islands)    │
 + files ──►│                    ▲                                                    │
            │                    │                                                    │
            │  admin editor ──► change set ──► serializer ──► ContentAdapter.saveDraft │
            │       │                                              │                  │
            │       └── AuthAdapter.getSession                     └► .publish        │
            └─────────────────────────────────────────────────────────────────────────┘
                                   ▲                    ▲
                                   │ implements         │ implements
            ┌──────────── instance (private repo) ────────────┐
            │  auth provider    publish functions    brand data + files    host config │
            └──────────────────────────────────────────────────────────────────────────┘
```

- **Framework:** Astro, static output. React islands only where interaction needs them (search, icon detail, logo helper, signature generator, admin).
- **Delivery to instances:** the engine ships as an Astro integration (`@yon-tyzes/brand-hub`). It injects the public routes and `/admin`, reads `hub.config.ts`, and loads brand data from the instance. Instances pin a tagged version.
- **Hosting:** any static host. The reference instance uses Netlify (build hooks, branch deploys, functions).

## 3. Repo layout (engine)

```
brand-hub/
  src/
    integration/        Astro integration entry, route injection, config loader
    content/            loaders and schema bindings
    components/         shared UI (Button, Card, Tabs, Sheet, Toast, SearchDialog ...)
    modules/            one folder per module: page, detail views, islands
    admin/              editor app (React)
    serializer/         change set to files, deterministic
    adapters/           interfaces + local and demo implementations
    theme/              token pipeline: brand.json to CSS custom properties
  schemas/              JSON Schema and zod sources for every data file
  brands/demo/          fictional brand used by the public demo
  scripts/              check-copy, build-icons, build-fonts, build-zips
  docs/                 ENGINE_SPEC.md, STANDARDS.md, DESIGN_SYSTEM.md, ADAPTERS.md
```

## 4. Configuration

`hub.config.ts` in each instance:

```ts
export default defineHub({
  brand: "acs",                       // folder under brands/
  modules: ["start", "logos", "colors", "fonts", "icons", "photos",
            "templates", "signature", "boilerplate", "guide", "whats-new"],
  search: { shortcut: ["mod+k", "/"] },
  indexing: false,                    // adds noindex when false
  analytics: { provider: "plausible", domain: "brand.example.com" },
  admin: { enabled: true, adapter: "./adapters/github.ts", auth: "./adapters/auth.ts" },
  uploads: { maxBytes: 25_000_000 },
});
```

A module that is off produces no route, no nav item, and no search entries.

## 5. Data model

Every item on the site is an **Asset**. Shared fields live on the base type. Each module extends it.

```ts
type Status = "locked" | "pending" | "draft" | "retired";

interface Asset {
  id: string;                 // kebab-case, unique per brand
  type: "logo" | "color" | "font" | "icon" | "template" | "photo-source"
      | "boilerplate" | "document" | "rule" | "signature-layout";
  label: string;              // plain name shown in UI and search
  help?: string;              // one line: when to use it
  status: Status;
  version: string;            // "1.0"
  updated: string;            // ISO date, set by the serializer
  audience: "public" | "internal";
  governedBy?: string[];      // rule ids
  keywords?: string[];
  order?: number;
}
```

Module extensions (summary):

| Type | Extra fields |
|---|---|
| logo | `lockup`, `colorway`, `background` (light, dark), `files[]` { ext, path, width? } |
| color | `hex`, `rgb`, `cmyk?`, `pms?`, `role`, `pairings[]` (contrast-checked fg/bg) |
| font | `family`, `role`, `weights[]`, `files` { static[], variable[] }, `license`, `install` |
| icon | `svgPath`, `group`, `pinned`, `source`, `standIn?` |
| template | `category`, `url` (template link), `fallbackUrl?`, `thumbnail`, `rules[]` |
| photo-source | `provider` (dropbox, drive, sharepoint, url), `url`, `access` (open, sign-in), `guidelines[]` |
| boilerplate | `lengths` { short, medium, long }, `context` |
| rule | `title`, `body` (markdown), `do[]`, `dont[]`, `appliesTo[]` (asset ids) |
| signature-layout | `name`, `html` (template with tokens), `fields[]`, `fixed` { address, website } |

Rendering rules:

- Only `locked` items render on public pages. `pending` items appear as one line each in an "In progress" list on What's new. `draft` items exist only in the editor. `retired` items stay in history and leave the site.
- Every asset links to the rules in `governedBy`. Every rule lists the assets in `appliesTo`. The loader checks both directions at build and fails on a broken reference.

Files per brand:

```
brands/<slug>/
  brand.json          name, short name, tokens, module settings
  assets.json         all Asset records (or split per module: logos.json, icons.json ...)
  rules.json
  changelog.json      written by the serializer on publish
  files/              logos, fonts, icons, thumbnails, documents
```

## 6. Public site

### Information architecture

| Route | Purpose |
|---|---|
| `/` | Search, top tasks, recent changes |
| `/start` | New team member path: mission, values, signature setup, font install, where things live |
| `/logos` | Lockups with background toggle, "which file do I need" helper, downloads |
| `/colors` | Swatches, copy in HEX, RGB, CMYK, PMS; approved pairings |
| `/fonts` | Family cards, zip download per family, install steps per OS and app |
| `/icons` | Pinned core set, grouped library, filters, detail sheet |
| `/photos` | Photo library link, photo rules, headshot standard |
| `/templates` | Category filters, template cards, rules per template |
| `/signature` | Generator with live preview and install steps |
| `/guide/*` | Rules as readable pages |
| `/whats-new` | Changelog and the "In progress" list |

### Shared interactions

- **Search:** build-time index of every rendered asset and rule. Opens with Cmd/Ctrl+K or `/`. Full screen on small screens. Results carry inline actions (copy hex, download SVG, open template).
- **Copy:** a single toast region (`aria-live="polite"`) announces what was copied and in which format.
- **Downloads:** direct file links from the site. Font zips and "all logos" zips are built at build time.
- **Icons:** recolor in the browser (all SVGs use `currentColor`). PNG export through canvas at preset sizes.
- **Photos:** a link card to the instance's photo source, labeled with access type, plus the photo and headshot rules. v2 adds a curated on-site set.
- **Theme:** light by default, optional dark theme from brand tokens. Toggle remembered per viewer.

### Performance and access budgets

- Home page JS under 100 KB gzipped. Pages without islands ship only the shared shell script (theme, menus, search shortcut), under 5 KB gzipped.
- LCP under 2.0s on a throttled 4G profile.
- WCAG 2.2 AA. Every control keyboard-reachable with visible focus.

## 7. Admin editor

Route `/admin`. Hidden from nav and search. Requires a session from the `AuthAdapter`.

### Workspace

- Left: module list with item counts and a status filter (all, draft, pending, locked).
- Center: grid of items as visual cards, the same previews the public site uses. Drag to reorder.
- Right: inspector panel for the selected item. Form fields come from the module schema. Validation messages appear inline as the person types.
- Top bar: change count, Undo/Redo, Preview, Save draft, Publish.

### Actions

| Action | Behavior |
|---|---|
| Add | Drop files onto the grid or click Add. The editor detects type from the module and file, fills what it can (name, dimensions, colors from SVG), and opens the inspector. |
| Edit | Inline rename on the card, all other fields in the inspector. |
| Replace file | Drop a new file on an existing card. Version bumps on publish. |
| Remove | Moves the item to `retired`. Hard delete is a separate confirm in the inspector. |
| Reorder | Drag on the grid. Writes `order`. |
| Status | Draft, pending, locked, retired. Only locked shows on the public site. |

### Upload handling

- Size cap from config (default 25 MB). Larger files get a clear message and a link field instead.
- SVG uploads are sanitized (scripts, event handlers, external references, and `foreignObject` stripped) and normalized (`currentColor` for icons, viewBox kept).
- Raster images get dimensions read and a thumbnail generated in the browser.
- File names are rewritten to the brand's naming pattern by the serializer. The person never types a file name.

### Draft, preview, publish

```
edit in admin ──► change set (in memory, autosaved to IndexedDB)
      │
      ├─ Preview ──► renders the public pages from draft data in an iframe, same components
      │
      ├─ Save draft ──► serializer ──► ContentAdapter.saveDraft()
      │                              (reference instance: commit to the drafts branch,
      │                               host builds a shareable preview URL)
      │
      └─ Publish ──► ContentAdapter.publish()
                     (reference instance: merge drafts into main, host rebuilds production)
```

- The serializer is deterministic code, not a generator. Same change set in, same files out. It validates against the schemas and refuses to save on any error.
- Publish writes one changelog entry per changed asset ("Logo, horizontal navy: file replaced") and the editor's name.
- Conflict check: saveDraft and publish send the base revision. If the remote moved, the editor shows what changed and asks the person to reload or overwrite.
- Every publish is a git commit, so history and rollback come from git. The editor lists recent publishes with a Restore action that creates a new draft from that revision.

## 8. Adapters

The engine defines interfaces. Instances implement them. The engine ships two implementations for development and the public demo.

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

| Implementation | Where | Use |
|---|---|---|
| `local` | engine | Dev server writes files to disk. No auth. |
| `demo` | engine | In-memory. Resets on reload. Lets public visitors try the editor. |
| `github` | instance | Server functions commit to the instance repo with a scoped token. |

The engine never holds credentials. Tokens live only in the instance's server functions.

## 9. Theming

`brand.json` holds tokens. A build step writes them to CSS custom properties.

```json
{
  "tokens": {
    "color": { "bg": "#F9F9FA", "surface": "#FFFFFF", "text": "#0B2239", "muted": "#6D6E71",
               "primary": "#0F3D6B", "link": "#1565A8", "border": "#E3E5E8" },
    "font": { "display": "Archivo", "body": "Inter" },
    "radius": { "sm": 6, "md": 10, "lg": 16 },
    "space": [4, 8, 12, 16, 24, 32, 48, 64, 96]
  }
}
```

The layout system, type scale ratios, and component shapes come from `docs/DESIGN_SYSTEM.md`. Brands change tokens, not components.

## 10. Quality gates

`npm run check` runs, in order: schema validation, reference integrity, `check-copy`, type check, accessibility tests (axe on every route, light and dark), and a link check on all download paths. CI blocks merge on failure.

## 11. Roadmap

| Version | Scope |
|---|---|
| 0.1 | Public site for logos, colors, fonts, icons, photos, templates, search. Demo brand. |
| 0.2 | Admin editor with local and demo adapters. Serializer. Preview. |
| 0.3 | Signature generator, start page, guide pages, What's new. |
| 0.4 | Boilerplate copy, logo helper, analytics events, curated photo set. |
