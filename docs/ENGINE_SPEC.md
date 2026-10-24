# Brand Hub engine specification

Version 0.3 draft. This document defines the engine: a static brand resource site plus an in-site editor, driven entirely by brand data. One engine serves many brands. Each brand lives in its own instance repo.

Release 0.2 is the redesign. It gives the site a neutral shell the engine owns, three-part navigation (Library, Brand guide, Create), a search-first home page, and a rebuilt editor. Section 13 lists what changes for instances moving from 0.1.

## 1. Goals

1. A team member finds and uses any brand asset in under 30 seconds, on desktop or phone.
2. A non-developer adds, edits, and removes assets inside the site, previews the result, and publishes it without touching code or JSON.
3. A new brand instance launches by adding data and files, not by changing engine code.
4. The public site stays fast on a weak mobile signal and meets WCAG 2.2 AA.
5. Every brand gets the same polished shell. The brand shows up as content, never as decoration on the interface.

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

- **Framework:** Astro, static output. React islands only where interaction needs them (search, icon detail, type tester, logo helper, signature generator, hero motion, admin).
- **Delivery to instances:** the engine ships as an Astro integration (`@yon-tyzes/brand-hub`). It injects the public routes and `/admin`, reads `hub.config.ts`, and loads brand data from the instance. Instances pin a tagged version.
- **Hosting:** any static host. The reference instance uses Netlify (build hooks, branch deploys, functions).
- **Shell and brand:** the engine owns the interface: background, text, borders, controls, navigation, and the interface fonts. Brand data supplies the content: logos, colors, fonts, icons, templates, photos, rules, and the hue of the home page gradient. A brand never restyles the shell. Section 10 has the details.

## 3. Repo layout (engine)

```
brand-hub/
  src/
    integration/        Astro integration entry, route injection, redirects, config loader
    content/            loaders and schema bindings
    components/         shared UI (Button, Chip, Card, SearchField, TopTabs, Sidebar, Toast ...)
    modules/            one folder per module: page, detail views, islands
    hero/               home hero: search-first layout and the gradient presets
    admin/              editor app (React)
    serializer/         change set to files, deterministic
    adapters/           interfaces + local and demo implementations
    theme/              shell tokens, interface fonts, hero color tuning
    office/             Office theme (.thmx) writer, run at build time
  schemas/              JSON Schema and zod sources for every data file
  brands/demo/          fictional brand used by the public demo
  scripts/              check-copy, check-structure, build-icons, build-fonts, build-zips
  docs/                 ENGINE_SPEC.md, STANDARDS.md, DESIGN_SYSTEM.md, ADAPTERS.md
```

## 4. Configuration

`hub.config.ts` in each instance:

```ts
export default defineHub({
  brand: "acs",                       // folder under brands/
  modules: ["logos", "colors", "fonts", "icons", "photos", "templates", "office",
            "boilerplate", "guide", "start", "signature", "changes"],
  search: { shortcut: ["mod+k", "/"] },
  hero: { preset: "mesh" },           // "mesh" (default) or "contour"
  indexing: false,                    // adds noindex when false
  analytics: { provider: "plausible", domain: "brand.example.com" },
  admin: { enabled: true, adapter: "./adapters/github.ts", auth: "./adapters/auth.ts" },
  uploads: { maxBytes: 25_000_000 },
});
```

- A module that is off produces no route, no navigation item, and no search entries.
- A top tab with no enabled modules is hidden. With `signature` off, there is no Create tab.
- The module id `whats-new` from 0.1 is accepted as an alias of `changes` and prints a build warning.

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
| logo | `lockup`, `colorway`, `background` (light, dark), `files[]` { ext: svg, png, pdf, eps; path; width? } |
| color | `hex`, `rgb`, `cmyk?`, `pms?`, `role`, `pairings[]` (contrast-checked fg/bg) |
| font | `family`, `role`, `weights[]`, `files` { static[], variable[] }, `license`, `install` |
| icon | `svgPath`, `group`, `pinned`, `source`, `standIn?` |
| template | `category`, `formats` { canva?, docx?, pptx?, pdf? }, `thumbnail`, `rules[]` |
| photo-source | `provider` (dropbox, drive, sharepoint, url), `url`, `access` (open, sign-in), `guidelines[]` |
| boilerplate | `lengths` { short, medium, long }, `context` |
| rule | `title`, `chapter`, `body` (markdown), `do[]`, `dont[]`, `appliesTo[]` (asset ids) |
| signature-layout | `name`, `html` (template with tokens), `fields[]`, `fixed` { address, website } |

### Template formats

Each template offers up to four formats: Canva, Word (.docx), PowerPoint (.pptx), and PDF.

- `formats.canva` is a share link. `docx`, `pptx`, and `pdf` are file paths under `files/`.
- At least one format is required. The build fails on a template with none.
- Canva is the recommended format. When a template has a Canva link, its card's primary button is "Open in Canva," and the other formats follow as secondary buttons labeled "Word," "PowerPoint," and "PDF."
- Only the formats a template has are shown. No empty or disabled buttons.

### Brand guide chapters

`brand.json` lists the chapters under `guide.chapters`, in reading order: `[{ "id": "logo-use", "title": "Logo use" }, ...]`. Every rule names one chapter in `chapter`. The build fails on a rule whose chapter is not listed.

### Rendering rules

- Only `locked` items render on public pages.
- `pending` items exist only in the editor, labeled "Pending: not on the site yet, waiting for approval."
- `draft` items exist only in the editor.
- `retired` items stay in history and leave the site.
- Every asset links to the rules in `governedBy`. Every rule lists the assets in `appliesTo`. The loader checks both directions at build and fails on a broken reference.

Files per brand:

```
brands/<slug>/
  brand.json          name, short name, primary color, guide chapters, quick downloads, module settings
  assets.json         all Asset records (or split per module: logos.json, icons.json ...)
  rules.json
  changelog.json      written by the serializer on publish
  files/              logos, fonts, icons, thumbnails, template files, documents
```

## 6. Public site

### Navigation

The top bar holds the brand name and mark, three tabs, search, and the theme toggle. Each tab sets what the sidebar lists. The sidebar shows on every page, the home page included. There is no landing page in front of the library.

| Tab | Purpose | Sidebar lists |
|---|---|---|
| Library | Get a file or a value | All files (the home page), Logos, Colors, Fonts, Icons, Photos, Templates, Office theme, Company descriptions |
| Brand guide | Learn how to use the brand | New to the team, then the chapters from `guide.chapters` |
| Create | Make something with your own details on it | Email signature, and later tools such as the logo helper |

Below 992px the sidebar becomes a horizontal chip row under the tabs. Below 768px the tabs become a segmented control under the top bar.

The footer links to the change log and the brand contact. The engine version never appears on public pages.

### Routes

| Route | Tab | Purpose |
|---|---|---|
| `/` | Library | Search-first hero, quick downloads, then a preview of each category |
| `/logos` | Library | Lockups, logo rules, downloads named by use |
| `/colors` | Library | Main and supporting colors, every value copyable, approved text-on-color pairs |
| `/fonts` | Library | Type tester, family cards, downloads, install steps |
| `/icons` | Library | Grouped library, recolor, filter, detail panel |
| `/photos` | Library | Photo library link, photo rules, headshot standard |
| `/templates` | Library | Category filters, template cards with their formats, template rules |
| `/office` | Library | Office theme download and install steps (section 7) |
| `/descriptions` | Library | Approved company descriptions in three lengths |
| `/guide` | Brand guide | Chapter list |
| `/guide/new-to-the-team` | Brand guide | New team member path: signature, font install, where things live |
| `/guide/<chapter>` | Brand guide | A chapter: its rules, with diagrams and do and don't examples |
| `/create/signature` | Create | Signature generator with live preview and install steps |
| `/changes` | Footer | Published changes, newest first |

Routes from 0.1 redirect: `/start` to `/guide/new-to-the-team`, `/signature` to `/create/signature`, `/boilerplate` to `/descriptions`, `/whats-new` to `/changes`, and `/guide/<rule-id>` to its chapter page.

### Library pages

- Each Library page opens with a short strip of the rules that apply to it, with a link to the full chapter.
- Downloads are named by use, with the format beside the label: "For Word and PowerPoint (PNG)", "For print and web (SVG)". Color values are labeled Web, RGB, Print, and Sign.
- The home page shows "Quick downloads": the items in `brand.json` `quickDownloads`, chosen in the editor. The label stays "Quick downloads" until the site collects download counts.
- Cards show the real asset in their preview area, never an icon standing in for it. Card actions are always visible, on touch and keyboard too.

### Home hero

- The brand name and "brand files" as the title, a large search field, and up to four quick-pick chips.
- The search placeholder types out real asset names from the brand's data, one after another. It holds still under reduced motion.
- Behind it, a slow grain mesh gradient in three pale tones tuned from the brand's primary color (section 10). `hero.preset: "contour"` swaps in a field of thin contour lines for brands whose palette is very loud or nearly monochrome.
- The hero sits inside the content column, about 320px tall, so the quick downloads row shows above the fold on a laptop.

### Shared interactions

- **Search:** build-time index of every rendered asset and rule. Opens with Cmd/Ctrl+K or `/`. The hint shows the shortcut for the viewer's platform only. Results are grouped by type (Colors, Logos, Rules ...) and carry inline actions (copy hex, download, open). Full screen on small screens.
- **Copy:** a single toast region (`aria-live="polite"`) names what was copied: "Comet Green #1E5B4A copied".
- **Downloads:** direct file links from the site. Font zips, "all logos" zips, and the Office theme are built at build time.
- **Icons:** recolor in the browser in the colors listed in `modules.icons.colors` (all SVGs use `currentColor`). PNG export through canvas at preset sizes.
- **Fonts:** a type tester sets the viewer's own words in each brand family. On phones the page offers "Copy page link," since fonts install on a computer.
- **Photos:** a link card to the instance's photo source, labeled with access type, plus the photo and headshot rules.
- **Theme:** light by default, following the system setting, with a toggle in the top bar remembered per viewer.

### Frosted surfaces

Frosted glass appears only where something sits behind it: the hero search field and chips, the top bar after the page scrolls, the search dialog, toasts, and the mobile tab bar. It is solid under `prefers-reduced-transparency` and where `backdrop-filter` is unsupported. No refractive effects.

### Motion

- Interface motion runs 120 to 320ms with an ease-out curve and no bounce: card lift on hover, copy confirmation, dialog open, filter reflow.
- The hero gradient drifts slowly, loads after the page renders, and pauses when the tab is hidden or the hero is offscreen.
- Under `prefers-reduced-motion`, transitions are instant and the hero shows one still frame. Without WebGL, the hero shows a static gradient.
- No scroll-triggered fades, parallax, glows, or blur-in headings.

### Performance and access budgets

- Home page JS under 100 KB gzipped, including the hero. The hero script loads after first paint and stays under 12 KB gzipped.
- Pages without islands ship only the shared shell script (theme, menus, search shortcut, frosted top bar), under 5 KB gzipped.
- LCP under 2.0s on a throttled 4G profile.
- WCAG 2.2 AA in light and dark. Every control keyboard-reachable with visible focus. Touch targets at least 44px on phones.

## 7. Office theme

An Office theme file (`.thmx`) loads the brand's colors and fonts into the Design and Page Layout menus of Word, PowerPoint, and Excel. After one install, the brand palette is the color picker's top row, charts use brand colors by default, and the heading and body fonts are preset. Most staff build documents in Office, so this puts the brand where they already pick colors.

### Data

Set in `brand.json` under `modules.office`. Every slot references a color or font that already exists in brand data, so the theme can't drift from the site.

```json
{
  "modules": {
    "office": {
      "themeName": "Pocket Comet",
      "colors": {
        "dk1": "ink", "lt1": "kiln-white", "dk2": "comet-green", "lt2": "mist",
        "accent1": "comet-green", "accent2": "copper", "accent3": "clay",
        "accent4": "slate", "accent5": "mist", "accent6": "ink",
        "hlink": "comet-green", "folHlink": "slate"
      },
      "fonts": { "major": "fraunces", "minor": "inter" }
    }
  }
}
```

| Slot | Office role | Guidance |
|---|---|---|
| `dk1` / `lt1` | Text and background, dark and light | Body text color and the page background |
| `dk2` / `lt2` | Secondary dark and light | Primary brand dark and the off-white |
| `accent1` to `accent6` | Shapes, charts, table styles, in this order | Primary first. Charts take series colors in this order. |
| `hlink` / `folHlink` | Link and visited link | The brand's link color |
| `fonts.major` / `fonts.minor` | Headings and body | Display and body font ids |

Rules:

- All twelve color slots and both font slots are required. Office needs six accents. A brand with fewer approved colors fills the remaining accents with declared neutrals. The engine does not invent tints.
- Only `locked` colors and fonts may fill a slot. The loader fails the build if a slot points at a `pending`, `draft`, or `retired` item.
- Accent pairs used as chart series must be distinguishable. The loader warns when two adjacent accents differ by less than 15 in CIELAB delta E.

### Build

- `src/office/` writes the theme as an OOXML package: `[Content_Types].xml`, `_rels/.rels`, `theme/theme/theme1.xml` (color scheme, font scheme, and a standard format scheme for fills, lines, and effects), and a thumbnail rendered from the palette.
- Output path: `/downloads/<brand>-office-theme.thmx`. The file name and the theme name inside it come from `themeName`.
- Deterministic like the serializer: the same brand data produces a byte-identical file, so a rebuild without changes shows no diff.
- When the editor publishes a change to a color or font in a slot, the next build regenerates the theme, and the change log gets an entry: "Office theme updated: install the new version."

### Page

`/office` shows:

1. A preview of the twelve colors in slot order and both fonts set in a sample heading and paragraph.
2. One primary button: "Download Office theme." Under it: the version, the date, and the file size.
3. Install steps in an accordion: Windows and Mac, each with Word, PowerPoint, and Excel. Each set ends with "Apply it to an open file" and "Make it the default for new files."
4. A note that the fonts must be installed for headings and body text to show correctly, with a link to `/fonts`. If they are missing, Office substitutes a default font.
5. A note for Google Workspace users that Docs and Slides do not read `.thmx` files, with a link to the brand's Slides template if one exists in templates data.

The download card also appears on `/colors`, `/fonts`, and `/guide/new-to-the-team`, and in search under "Office," "Word," "PowerPoint," "Excel," and "theme."

### Tests

- Unit: the generated package unzips, `theme1.xml` is well-formed and valid against the DrawingML theme schema, all twelve colors and both fonts appear with the expected values, and the output is byte-identical across two builds.
- Loader: a slot that references a missing or pending item fails the build with the slot name in the message.
- Manual, once per release: open the demo theme in PowerPoint and Word on Windows and on Mac, apply it, and confirm the colors and fonts. Record the Office versions checked in the release notes.

## 8. Admin editor

Route `/admin`. Hidden from nav and search. Requires a session from the `AuthAdapter`.

### Layout

- **Top bar:** brand name with an "Editor" label, a "View site" link, the unsaved change count, Undo, Redo, Preview, Save draft, and Publish. Publish is the one primary button.
- **Sidebar:** Overview, then each enabled module with its item count, then Brand settings and History. The signed-in person's name and Sign out sit at the bottom.
- **Overview** (`/admin`):
  - "Add to the brand" tiles, one per module, each saying what to drop in.
  - "Ready to publish": the unsaved and drafted changes, each with a Review link, plus Preview changes and Publish.
  - "Waiting on a decision": pending items.
  - "Recent changes" from the change log.
- **Module view** (`/admin/<module>`):
  - Center: grid of items as cards with the same previews the public site uses, a status dot and label on each, and an "Edited" mark on changed items. Drag to reorder.
  - Right: the inspector for the selected item. Form fields come from the module schema. Validation messages appear inline as the person types.

### Statuses

| Status | Label | Help text in the inspector |
|---|---|---|
| `locked` | Live | On the site after you publish. |
| `pending` | Pending | Not on the site yet. Waiting for approval. |
| `draft` | Draft | Only in the editor. |
| `retired` | Retired | It leaves the site when you publish. You can restore it later. |

### Actions

| Action | Behavior |
|---|---|
| Add | Drop files onto the grid or an Overview tile, or click Add. The editor detects type from the module and file, fills what it can (name, dimensions, colors from SVG), and opens the inspector. |
| Edit | Inline rename on the card, all other fields in the inspector. |
| Replace file | Drop a new file on an existing card. Version bumps on publish. |
| Remove | Moves the item to `retired`. Hard delete is a separate confirm in the inspector. |
| Reorder | Drag on the grid. Writes `order`. |
| Status | Live, Pending, Draft, Retired. Only Live shows on the public site. |

The inspector covers the 0.2 data additions: template formats (a Canva link field plus Word, PowerPoint, and PDF file slots), the rule chapter (a select from `guide.chapters`), and PDF and EPS slots on logos. Brand settings edit the brand name, primary color, guide chapters, and quick downloads.

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
- Every publish is a git commit, so history and rollback come from git. History lists recent publishes with a Restore action that creates a new draft from that revision.

## 9. Adapters

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

## 10. Theming

### Shell tokens

The engine owns the shell's tokens: surfaces, text, borders, controls, focus, status colors, frosted glass, spacing, radius, motion, and layout, in light and dark. They live in `src/theme/` and are documented in `docs/DESIGN_SYSTEM.md`. Brands cannot override them.

The interface fonts are Mona Sans for all interface text and Martian Mono for values people copy (HEX, RGB, CMYK, PMS, file names). Both are licensed under the SIL Open Font License and are self-hosted by the engine. Brand fonts appear only as content: specimens on `/fonts`, the type tester, and previews.

### Brand tokens

`brand.json` sets only what the shell needs from the brand:

```json
{
  "tokens": {
    "color": { "primary": "#1E5B4A" }
  },
  "hero": { "tint": null },
  "quickDownloads": ["logo-horizontal", "comet-green", "fraunces", "template-letterhead"],
  "guide": { "chapters": [{ "id": "logo-use", "title": "Logo use" }] }
}
```

### Hero color tuning

The hero gradient never uses brand colors raw. The engine tunes them so every brand gives a soft, legible gradient:

1. Take `tokens.color.primary` and keep only its hue. If its chroma is under 0.03 in OKLCH, use the most saturated color in the brand's palette instead.
2. Build three tones in OKLCH: at that hue with lightness 0.88, at the hue plus about 35 degrees with lightness 0.92, and at the hue minus about 28 degrees with lightness 0.94. Keep chroma between 0.035 and 0.07.
3. A brand with no color above chroma 0.03 gets a cool neutral instead.
4. In dark theme, mix each tone about 80% toward the background.
5. `hero.tint` overrides the tuning with up to three exact colors, for a client who asks for a specific look.

The layout system, type scale, and component shapes come from `docs/DESIGN_SYSTEM.md`. Brands change their data, not the shell.

## 11. Quality gates

`pnpm check` runs, in order:

1. Schema validation.
2. Reference integrity, including Office theme slots, guide chapters, and template formats.
3. `check-copy`.
4. Shell script size.
5. Type check.

After `pnpm build`, `pnpm check:dist` runs `check-structure` on the built pages: no short text label directly above a heading.

`pnpm test:e2e` runs:

- Axe on every route in light and dark.
- Keyboard paths.
- Horizontal scroll checks at 320px.
- Reduced motion and reduced transparency fallbacks.
- The home page JS budget.
- Redirects from 0.1 routes.
- A link check on all download paths.

CI blocks merge on failure.

## 12. Roadmap

| Version | Scope | Status |
|---|---|---|
| 0.1 | Public site for logos, colors, fonts, icons, photos, templates, search, guide pages, What's new. Admin editor with local and demo adapters, serializer, preview. Demo brand. | Released (v0.1.0) |
| 0.2 | Redesign. Engine-owned shell and interface fonts, Library, Brand guide, and Create navigation, search-first home with tuned hero gradient, frosted surfaces, motion, guide chapters, template formats, logo print files, rebuilt editor with Overview. | Released (v0.2.0) |
| 0.3 | Email signature generator, New to the team, Office theme download. | Planned |
| 0.4 | Company descriptions, logo helper, analytics events (which turn Quick downloads into real usage data), curated photo set. | Planned |

Work beyond 0.4 is tracked in the product roadmap document, outside this repo.

## 13. Moving an instance from 0.1 to 0.2

| 0.1 | 0.2 | Handling |
|---|---|---|
| `brand.json` `tokens.color` bg, surface, text, muted, link, border; `tokens.font`; `tokens.radius`; `tokens.space`; `tokens.dark` | Removed. The engine owns the shell. | Ignored with a build warning. |
| `tokens.color.primary` | Kept. Feeds the hero tuning. | No change. |
| `brand.json` `topTasks` | `quickDownloads` | Old key read with a build warning. |
| Module id `whats-new`, route `/whats-new` | `changes`, `/changes` | Alias plus redirect. |
| Routes `/start`, `/signature`, `/boilerplate`, `/guide/<rule-id>` | Section 6 routes | Redirects. |
| Template `url`, `fallbackUrl` | `formats` | `url` is read as a single link with an "Open template" button and a build warning, until migrated. |
| Rules with no chapter | `chapter` required | Build fails. Add `guide.chapters` to `brand.json` and a `chapter` to each rule. |
| `pending` items listed on What's new | Editor only | No action. |
