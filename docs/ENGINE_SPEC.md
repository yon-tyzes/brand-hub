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
  motion: "full",                     // "full" (default) or "calm"
  indexing: false,                    // adds noindex when false
  analytics: { provider: "plausible", domain: "brand.example.com" },
  admin: { enabled: true, adapter: "./adapters/github.ts", auth: "./adapters/auth.ts" },  // enabled: true, false, or "dev"
  uploads: { maxBytes: 25_000_000 },
});
```

- A module that is off produces no route, no navigation item, and no search entries.
- From 0.3, a module whose page is built from brand data stays off until the brand has that data, even when it is listed: `office` needs `modules.office` in `brand.json`, `start` needs `onboarding.json`, `signature` needs `signature.json`, and `boilerplate` needs a locked boilerplate record. Section 14 has the details.
- A top tab with no enabled modules is hidden. With `signature` off, there is no Create tab.
- The module id `whats-new` from 0.1 is accepted as an alias of `changes` and prints a build warning.
- `motion: "calm"` turns off decorative motion for every viewer, as section 6, Motion, describes.
- `admin.enabled: "dev"` keeps the editor for `astro dev` only. A production build then ships no `/admin` route, no editor JavaScript, and no editor entries in search. `true` and `false` behave as before: the editor is in every build, or in none.

## 5. Data model

Every item on the site is an **Asset**. Shared fields live on the base type. Each module extends it.

```ts
type Status = "locked" | "pending" | "draft" | "retired";

interface Asset {
  id: string;                 // kebab-case, unique per brand
  type: "logo" | "color" | "gradient" | "font" | "icon" | "template" | "photo-source"
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
| gradient | `stops[]` { hex, at? }, `angle?` (from 0.3, section 14) |
| font | `family`, `role`, `weights[]`, `files` { static[], variable[], web[]? }, `license`, `install`, `group?` |
| icon | `svgPath`, `group`, `pinned`, `source`, `standIn?` |
| template | `category`, `formats` { canva?, docx?, pptx?, pdf? }, `thumbnail`, `rules[]`, `variants[]?` |
| photo-source | `provider` (dropbox, drive, sharepoint, url), `url`, `access` (open, sign-in), `guidelines[]` |
| boilerplate | `lengths` { short, medium, long }, `context` |
| rule | `title`, `chapter`, `body` (markdown), `do[]`, `dont[]`, `appliesTo[]` (asset ids) |
| signature-layout | `name`, `html` (template with tokens), `fields[]`, `fixed` { address, website }. Replaced in 0.3 by `signature.json` (section 14); still accepted with a build warning, and not used. |

### Template formats

Each template offers up to four formats: Canva, Word (.docx), PowerPoint (.pptx), and PDF.

- `formats.canva` is a share link. `docx`, `pptx`, and `pdf` are file paths under `files/`.
- At least one format is required. The build fails on a template with none.
- Canva is the recommended format. When a template has a Canva link, its card's primary button is "Open in Canva," and the other formats follow as secondary buttons labeled "Word," "PowerPoint," and "PDF."
- Only the formats a template has are shown. No empty or disabled buttons.

### Template variants

A template may offer variants of one design, such as two color versions: `variants: [{ "id": "green", "label": "Green", "thumbnail": "files/templates/letterhead-green.svg", "formats": { ... } }, ...]`.

- `id` is unique within the template. `thumbnail` is required. `formats` is optional and takes the same keys as the template's own; a variant without it uses the template's formats.
- The first variant is the default. With variants set, its thumbnail stands for the template everywhere: the card, the home page preview, and search. The template's own `thumbnail` stays required, so data from 0.2.1 stays valid.
- The card shows a variant switcher: one labeled chip per variant, built on native radio inputs, so arrow keys move between variants. Picking one swaps the thumbnail and, when that variant sets `formats`, the format buttons. It needs no script.
- Every variant file must exist. The build fails on a missing one, or on a duplicate variant id.

### Brand guide chapters

`brand.json` lists the chapters under `guide.chapters`, in reading order: `[{ "id": "logo-use", "title": "Logo use" }, ...]`. Every rule names one chapter in `chapter`. The build fails on a rule whose chapter is not listed.

### Brand guide PDF

`brand.json` may point to the full brand guide as one PDF: `"guide": { "chapters": [...], "pdf": { "path": "files/guide/<name>.pdf", "updated": "YYYY-MM-DD" } }`. The build fails if the file does not exist. When set:

- The Brand guide landing page (`/guide`) shows one secondary button, "Open the full guide (PDF, 1.2 MB)", with the size read from the file at build time. It opens the PDF in a new tab in the browser's own viewer. The engine ships no PDF viewer.
- Search lists it as "Brand guide (PDF)" in the Brand guide group, with an Open action.

### Font groups

`brand.json` may group the font families on `/fonts`: `"modules": { "fonts": { "groups": [{ "id": "office", "title": "...", "help": "..." }, ...] } }`, in display order. Each font names its group in `group`.

- With groups set, `/fonts` shows one section per group, in order, with its title and help line and a "Download all" zip of the group's static and variable files. Without groups, `/fonts` is unchanged.
- The loader fails the build on a font whose `group` is not listed, and, when groups are set, on a font with no `group`. Both messages name the font id. Group ids must be unique.

### Font files

A font's `files` holds three lists:

| List | Holds | Used for |
|---|---|---|
| `static[]` | One TTF or OTF file per weight, in `weights` order | The "For your computer" download |
| `variable[]` | A variable file covering every weight | The "For websites" download |
| `web[]` | WOFF2 files, optional | `@font-face` on the site only |

- `@font-face` uses `web[]` when present: a file whose name contains `wght` or `variable` covers the weight range, otherwise the files map to `weights` by position. Without `web[]`, the 0.2.1 behavior holds: the variable file, else the static files.
- Download zips hold `static[]` and `variable[]` files only, never `web[]`.
- Install steps on `/fonts` say: "Word, PowerPoint, and Excel need the TTF or OTF files. WOFF2 files are for websites and do not install."
- The build warns, without failing, when a font has `web[]` or WOFF2 files but no static TTF or OTF: `font "<id>" has only WOFF2 files, so it cannot be installed in Word.`

### Rendering rules

- Only `locked` items render on public pages.
- `pending` items exist only in the editor, labeled "Pending: not on the site yet, waiting for approval."
- `draft` items exist only in the editor.
- `retired` items stay in history and leave the site.
- Every asset links to the rules in `governedBy`. Every rule lists the assets in `appliesTo`. The loader checks both directions at build and fails on a broken reference.

Files per brand:

```
brands/<slug>/
  brand.json          name, short name, primary color, guide chapters and PDF, quick downloads, module settings
  assets.json         all Asset records (or split per module: logos.json, icons.json ...)
  rules.json
  signature.json      signature designs, from 0.3 (section 14)
  onboarding.json     New to the team steps, from 0.3 (section 14)
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
| `/logos` | Library | Lockups, logo rules, downloads by format |
| `/colors` | Library | Main and supporting colors, every value copyable, approved text-on-color pairs |
| `/fonts` | Library | Type tester, family cards (in groups when set), downloads, install steps |
| `/icons` | Library | Grouped library, recolor, search, detail panel |
| `/photos` | Library | Photo library link, photo rules, headshot standard |
| `/templates` | Library | Category filters, template cards with their formats, template rules |
| `/office` | Library | Office theme download and install steps (section 7) |
| `/descriptions` | Library | Approved company descriptions in three lengths |
| `/guide` | Brand guide | Chapter list, and the full guide PDF when set |
| `/guide/new-to-the-team` | Brand guide | New team member path: signature, font install, where things live |
| `/guide/<chapter>` | Brand guide | A chapter: its rules, with diagrams and do and don't examples |
| `/create/signature` | Create | Signature generator with live preview and install steps |
| `/changes` | Footer | Published changes, newest first |

Routes from 0.1 redirect: `/start` to `/guide/new-to-the-team`, `/signature` to `/create/signature`, `/boilerplate` to `/descriptions`, `/whats-new` to `/changes`, and `/guide/<rule-id>` to its chapter page. A redirect is built only when its target page is, so it always lands on a page.

### Library pages

- Each Library page opens with a short strip of the rules that apply to it, with a link to the full chapter.
- Logo and icon download buttons, on their Library page and in Quick downloads, read "Download" with the format beside it in small type. Visually hidden text names the asset, so each button has its own accessible name: "Download Stacked logo, PNG", "Download Hot cup icon, SVG".
- Color values are labeled Web, RGB, Print, and Sign.
- The home page shows "Quick downloads": the items in `brand.json` `quickDownloads`, chosen in the editor. The label stays "Quick downloads" until the site collects download counts.
- Cards show the real asset in their preview area, never an icon standing in for it. Card actions are always visible, on touch and keyboard too.

### Home hero

- The brand name and "brand files" as the title, a large search field, and up to four quick-pick chips. A logo chip shows the logo's label and downloads its PNG.
- The search placeholder types out real asset names from the brand's data, one after another. It holds still under reduced motion.
- Behind it, a slow grain mesh gradient in three pale tones tuned from the brand's primary color (section 10). `hero.preset: "contour"` swaps in a field of thin contour lines for brands whose palette is very loud or nearly monochrome.
- The hero sits inside the content column, about 320px tall, so the quick downloads row shows above the fold on a laptop.

### Shared interactions

- **Search:** build-time index of every rendered asset and rule. Opens with Cmd/Ctrl+K or `/`. The hint shows the shortcut for the viewer's platform only. Results are grouped by type (Colors, Logos, Rules ...) and carry inline actions (copy hex, download, open). Full screen on small screens.
- **Copy:** a single toast region (`aria-live="polite"`) names what was copied: "Comet Green #1E5B4A copied".
- **Colors:** each color card on `/colors` has a secondary "Copy hex code" button: no fill, a `border-control` boundary, and the copy icon. It copies the same value as clicking the hex, which stays clickable, and shows the same confirmation. Hidden text adds the color's name: "Copy hex code Comet Green".
- **Downloads:** direct file links from the site. Font zips, "all logos" zips, and the Office theme are built at build time.
- **Icons:** each color choice is a brand pair, an icon color on a ground, labeled "<icon color> on <ground>" ("Kiln White on Ink"). Icon colors come from `modules.icons.colors`, grounds from `modules.icons.grounds` (default: the brand's lightest and darkest locked colors). The engine builds every pair from the two lists, keeps those with contrast of at least 3:1, and orders them by icon color, then ground. The grid sits on one panel filled with the pair's ground; tiles are transparent with a hairline in the icon color, and labels take whichever shell text value passes 4.5:1 on that ground. Light theme opens on the first pair with a light ground, dark theme on the first with a dark ground; a viewer's pick is remembered. Each color chip is drawn in its own pair, the ground as fill and the icon color for its text and marks, so the bar reads as the palette and every chip shows its real colors. When the icon color is under 4.5:1 on its ground (it needs only 3:1 as an icon), the chip keeps the ground and the icon color for a dot and the check, and draws its text in the darkest shell text value that reaches 4.5:1 on the ground. The chosen chip also shows a check icon and a 2px ring, so the choice never rests on color alone. The chips are a radio group: arrow keys move the choice. Downloads are the icon in the exact icon color hex on a transparent background, as SVG and PNG (all SVGs use `currentColor`). Brand colors are never adjusted for display.
- **Icon search:** the field above the grid matches each icon's name, id (less a shared `icon-` prefix), and keywords, case-insensitive, on partial words; every word of the query must match. With a query, the groups give way to one flat grid of matches across all groups, and each result works as it does in its group: the chosen pair, download, and details. A count reads `4 icons match "arrow"`; with no match the grid says `No icons match "<query>".` Escape in the field or the "Clear search" button restores the groups. The browser's own clear button is hidden, so "Clear search" is the only one.
- **Fonts:** a type tester sets the viewer's own words in each brand family. On phones the page offers "Copy page link," since fonts install on a computer.
- **Photos:** a link card to the instance's photo source, labeled with access type, plus the photo and headshot rules.
- **Theme:** light by default, following the system setting, with a toggle in the top bar remembered per viewer.

### Frosted surfaces

Frosted glass appears only where something sits behind it: the hero search field and chips, the top bar after the page scrolls, the search dialog, toasts, and the mobile tab bar. It is solid under `prefers-reduced-transparency` and where `backdrop-filter` is unsupported. No refractive effects.

The hero search field and chips use their own recipe so they read over the gradient:

| | Light | Dark |
|---|---|---|
| Fill | `rgba(255, 255, 255, 0.42)` | `rgba(22, 24, 29, 0.5)` |
| Backdrop | `blur(14px) saturate(1.8)` | `blur(14px) saturate(1.8)` |
| Border | 1px `rgba(11, 13, 16, 0.09)` | 1px `rgba(255, 255, 255, 0.10)` |
| Shadow | inset top `rgba(255, 255, 255, 0.9)`, inset bottom `rgba(11, 13, 16, 0.04)`, `0 1px 2px rgba(11, 13, 16, 0.04)`, `0 10px 24px -10px` brand shadow | inset top `rgba(255, 255, 255, 0.08)`, `0 10px 24px -10px rgba(0, 0, 0, 0.5)` |

- The brand shadow (`--hero-shadow`) is the hero hue at OKLCH lightness 0.45 and chroma 0.08, at 28% alpha. A brand on the neutral fallback uses `rgba(11, 13, 16, 0.16)`.
- Chips lift 1px on hover, fill to 0.6, and deepen the shadow over the fast duration. They scale to 0.98 while pressed.
- A pointer light sits inside the hero search field: a radial highlight, white at 55% fading to transparent (4% in dark theme, so the search hint keeps 4.5:1 under it), about 120px across, centered on the pointer. It fades in on hover and out on leave over the base duration. Fine pointers only (`hover: hover` and `pointer: fine`), off under reduced motion and reduced transparency. Custom properties set from `pointermove`, throttled to animation frames.

### Motion

- Interface motion runs 120 to 320ms with an ease-out curve and no bounce: card lift on hover, copy confirmation, dialog open, filter reflow.
- The hero gradient drifts slowly, loads after the page renders, and pauses when the tab is hidden or the hero is offscreen.
- Under `prefers-reduced-motion`, transitions are instant and the hero shows one still frame. Without WebGL, the hero shows a static gradient.
- No scroll-triggered fades, parallax, glows, or blur-in headings.

#### Calm motion

`motion: "calm"` in `hub.config.ts` is for brands that want a still site for every viewer. It uses the reduced-motion path: one "still" condition, true under `prefers-reduced-motion` or when the page has `data-motion="calm"` on its root, drives every decorative motion below.

| Off under calm | Kept under calm |
|---|---|
| The hero animation. The hero script is not loaded; the static gradient frame shows. | Copy confirmations |
| The pointer light | The download arrow |
| Page transitions and the sliding tab and sidebar indicator | Press feedback |
| The placeholder typing. The placeholder shows its first example, still. | Focus states |
| The icon recolor wave. Icons recolor at once. | Dialog and toast open and close |

The kept motions are feedback, not decoration. `prefers-reduced-motion` still makes every transition instant, calm or not.

### Performance and access budgets

- Home page JS under 100 KB gzipped, including the hero. The hero script loads after first paint and stays under 12 KB gzipped.
- Pages without islands ship only the shared shell script (theme, menus, search shortcut, frosted top bar), under 5 KB gzipped.
- LCP under 2.0s on a throttled 4G profile.
- WCAG 2.2 AA in light and dark. Every control keyboard-reachable with visible focus. Touch targets at least 44px on phones.

## 7. Office theme

An Office theme file (`.thmx`) loads the brand's colors and fonts into the Design and Page Layout menus of Word, PowerPoint, and Excel. After one install, the brand palette is the color picker's top row, charts use brand colors by default, and the heading and body fonts are preset. Most staff build documents in Office, so this puts the brand where they already pick colors.

### Data

Set in `brand.json` under `modules.office`, which is optional. Without it there is no `/office` page, nav item, or search entry, even with `office` in `modules`. Every slot references a color or font that already exists in brand data, so the theme can't drift from the site.

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

From 0.2.2: the font inspector has a group select (from `modules.fonts.groups`) and a web files slot, and the template inspector has a variants list (label, thumbnail, and optional format files per variant). Brand settings add the brand guide PDF slot and the font group list.

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
4. In dark theme, mix each tone about 60% toward the background.
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
| 0.2.1 | Polish: glass, dark mode icons and logos, micro-interactions. | Released (v0.2.1) |
| 0.2.2 | Brand guide PDF, font groups, web font files, calm motion, template variants, editor in local dev only. All optional; 0.2.1 instances build unchanged. | Released (v0.2.2) |
| 0.2.3 | Stabilization: "Download" button labels, "Copy hex code" on color cards, icon search results, color chips in their own pair. 0.2.2 instances build unchanged. | Released (v0.2.3) |
| 0.3 | Email signature generator, New to the team, Office theme download, gradient colors, download analytics. All optional; 0.2.2 instances build unchanged. Section 14. | In progress |
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

## 14. Release 0.3

Release 0.3 adds four features and plans a fifth. Every one is optional and driven by brand data: a 0.2.2 instance builds unchanged, with no new warnings, and a feature without data adds no page, no nav item, no search entry, and no redirect.

### Routes

0.3 keeps the routes section 6 already defines. No new paths.

| Feature | Module | Route | Tab | On when |
|---|---|---|---|---|
| Email signature | `signature` | `/create/signature` | Create | `signature` is in `modules` and `signature.json` has a design |
| New to the team | `start` | `/guide/new-to-the-team` | Brand guide | `start` is in `modules` and `onboarding.json` has a step |
| Office theme | `office` | `/office` | Library | `office` is in `modules` and `brand.json` sets `modules.office` |

- The 0.1 paths `/start` and `/signature` stay redirects to `/guide/new-to-the-team` and `/create/signature`. They are built only when the target page is. Without the data, both paths answer 404, as they do today with the module off.
- `/start` does not become a page of its own: New to the team belongs under the Brand guide tab, and existing links to `/guide/new-to-the-team` keep working.
- With `signature` off or without data, there is no Create tab (section 4).

### Email signature

Designs come from instance data, so a brand's signature designs never enter the engine. `signature.json` sits in the brand folder:

```json
{
  "fields": [
    { "id": "name", "label": "Name", "kind": "text", "required": true },
    { "id": "job-title", "label": "Job title", "kind": "text" },
    { "id": "email", "label": "Email", "kind": "email", "required": true },
    { "id": "phone", "label": "Phone", "kind": "phone" }
  ],
  "designs": [
    {
      "id": "classic",
      "label": "Classic",
      "template": "files/signatures/classic.html",
      "fields": ["name", "job-title", "email", "phone"],
      "headshot": true,
      "variants": [
        { "id": "green", "label": "Green", "colors": { "accent": "comet-green" } },
        { "id": "ink", "label": "Ink", "colors": { "accent": "ink" } }
      ]
    }
  ]
}
```

- `fields` lists every field any design uses: an id, a label, a `kind` (`text`, `email`, `phone`, or `url`), and `required`. `help` is optional, one line.
- Each design names an HTML template file under `files/`, the field ids it uses in form order, and one or more color variants. The first design and its first variant are the defaults.
- A variant maps template color names to color ids from brand data. Only locked colors may fill a variant.
- `headshot` offers an optional headshot: `true` for a 72px circle, or `{ "shape": "circle" | "rect", "width": <px>, "height": <px> }` with the size the template's `img` displays it at. A circle has equal sides. The photo is read in the browser, never uploaded, cropped to fill the shape (centered across, anchored about 35% from the top so heads stay in), drawn into a PNG at twice the display size with transparent corners for a circle, and embedded in the copied signature. The shape is in the pixels because some mail apps ignore `border-radius`.
- Template tokens: `{{field-id}}` for a field value (HTML-escaped), `{{color.<name>}}` for a variant color's hex, `{{headshot}}` for the headshot image, and `{{site}}` for the site's own address, for images the signature loads. `{{#field-id}} ... {{/field-id}}` keeps its content only when the field has a value; `{{#headshot}} ... {{/headshot}}` works the same way.
- The page: a design picker, a variant picker, the form, a live preview, and one primary action, "Copy signature," which puts the signature on the clipboard as rich HTML with a plain text fallback. Install steps follow the preview.
- The loader fails the build on a design that names a field not in `fields`, a variant color that does not exist or is not locked, a template file that does not exist, and on duplicate ids among fields, designs, or a design's variants. Each message names the id.
- A `signature.json` in the 0.2 shape (an array of `signature-layout` records) fails the build with a message that points to this section. `signature-layout` records in `assets.json` load with a warning and are not used.

### New to the team

An ordered list of first-week steps, from `onboarding.json`:

```json
{
  "steps": [
    { "id": "signature", "title": "Set up your email signature", "links": [{ "module": "signature" }] },
    { "id": "fonts", "title": "Install the brand fonts", "body": "Word and PowerPoint need them for headings in the brand font.", "links": [{ "module": "fonts" }, { "asset": "inter" }] }
  ]
}
```

- Each step has an id, a title, an optional one-paragraph `body`, and at least one link to the hub: `{ "asset": "<id>" }` for an asset or `{ "module": "<id>" }` for a module page. A link's text is the asset's or module's label, so the data holds no link copy.
- The page lists the steps in order, numbered. A link to a module that is off, or to an asset that is not on the site, is left out.
- The loader fails the build on a link to an asset id that does not exist, on an unknown module id, and on duplicate step ids. It warns on a link to an asset that is not locked.

### Office theme

Section 7 defines the theme, its `modules.office` data, the build, and the page. From 0.3:

- `modules.office` is validated: all twelve color slots, both font slots, and `themeName`.
- The loader fails the build on a slot that names a color or font that does not exist or is not locked. The message names the slot.
- The `.thmx` is built at build time from those colors and the two fonts, as section 7 describes.

### Gradient colors

A brand gradient is a record in `colors.json` with `type: "gradient"`:

```json
{
  "id": "comet-dusk", "type": "gradient", "label": "Comet dusk",
  "angle": 90,
  "stops": [{ "hex": "#1C2430" }, { "hex": "#1E5B4A" }, { "hex": "#B5653A" }],
  "status": "locked", "version": "1.0", "updated": "2026-10-30", "audience": "public"
}
```

- `stops` holds two or more hex values in order. A stop may set `at`, its position from 0 to 100. Set `at` on every stop or on none; positions must not go down.
- Stops are hex values, not color ids, because a brand gradient may pass through tones that are not palette colors.
- `angle` is in degrees, 0 to 360, default 90 (left to right).
- `/colors` shows each gradient as a card after the colors: its stops in order as solid swatches, each with its hex, and a "Copy CSS" action that copies a `linear-gradient()` value. The card shows the stops, not a blended fill: the only gradient in the shell stays the home hero (section 10, `docs/STANDARDS.md`).
- Search lists gradients in the Colors group with the "Copy CSS" action.

### Download analytics

Decided by the prompt 28 spike.
