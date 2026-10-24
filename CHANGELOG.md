# Changelog

Versions follow [Semantic Versioning](https://semver.org). Instances pin a tag, for example `github:yon-tyzes/brand-hub#v0.1.0`.

## 0.2.0 (2026-10-24)

The redesign. The engine now owns the interface, so every brand gets the same shell, and the brand shows up as content. Instances moving from 0.1 should read Breaking changes first.

### Public site

- Engine-owned shell in light and dark, following the system setting, with a theme toggle on every brand. Interface text is set in Mona Sans and copyable values in Martian Mono, both self-hosted (SIL Open Font License).
- Navigation in three tabs: Library, Brand guide, and Create. Each tab sets what the sidebar lists, and the sidebar shows on every page. A tab with nothing enabled is hidden. Below 992px the sidebar becomes a chip row that starts with the current page in view; below 768px the tabs become a segmented control.
- Search-first home page: the brand name and "brand files" as the title, a large search field with a typed hint made from real asset names, up to four quick picks, and Quick downloads chosen in the editor, followed by a preview of each category.
- Home hero gradient: a slow grain mesh in three pale tones tuned from the brand's primary color, loaded after first paint, paused offscreen and in hidden tabs, still under reduced motion, and a static gradient without WebGL. `hero.preset: "contour"` swaps in thin contour lines.
- Rebuilt Library pages. Each opens with the rules that apply to it, and downloads are named by use with the format beside the label ("For Word and PowerPoint (PNG)"). Logos offer PDF and EPS print files when present. Colors are labeled Web, RGB, Print, and Sign. Fonts have a type tester, and "Copy page link" on phones. Icons have recolor, filter, and a detail panel that docks at the bottom on phones. Templates show only the formats each one has, with Canva first.
- Brand guide: a chapter index and one page per chapter, with logo examples drawn from the brand's own logo files and do and don't lists.
- Search dialog grouped by type, with copy and download actions on each result. Full screen on phones.
- One toast region names what was copied or downloaded: "Comet Green #1E5B4A copied".
- Frosted glass only where something sits behind it (hero search and chips, the scrolled top bar, the search dialog, toasts, the phone icon panel), solid under reduced transparency.
- Interface motion from 120 to 320ms with no bounce, instant under reduced motion.
- Change log page at `/changes`, linked from a new footer with the brand contact.
- Touch targets of at least 44px on phones.

### Editor

- New shell: brand name with the Editor label, View site, the unsaved change count, Undo, Redo, Preview, Save draft, and Publish, with a sidebar of Overview, sections with item counts, Brand settings, History, and the signed-in person. Routes `/admin` and `/admin/<section>`.
- Overview: "Add to the brand" tiles that take dropped files, Ready to publish, Waiting on a decision, and Recent changes.
- Section workspace: item grid with an inspector on the right, a status filter, and the bulk actions from 0.1.
- Statuses shown as Live, Pending, Draft, and Retired, with plain help for each.
- New fields: template formats (a Canva link and Word, PowerPoint, and PDF files), a rule's chapter chosen from the guide's chapters, and logo PDF and EPS files.
- Brand settings: name, primary color with a preview of the tuned hero tones, guide chapters (add, rename, reorder, and remove once a chapter has no rules), and Quick downloads. Edits join the draft, so undo, autosave, preview, and the change list cover them.
- Save, preview, publish, conflict handling, history, SVG cleaning, and demo mode work as in 0.1.

### Data

- `brand.json`: `tokens` holds only `color.primary`. New `hero.tint` (up to three exact gradient colors), `quickDownloads`, and `guide.chapters`.
- Rules: a required `chapter`, from `guide.chapters`.
- Templates: `formats` with optional `canva`, `docx`, `pptx`, and `pdf`, at least one required.
- Logos: files can include `pdf` and `eps`.
- Loader checks for chapters, template formats, and Quick downloads (each must be an existing locked asset), with one line per problem.
- 0.1 data is read with one build warning per old key, naming the fix.

### Breaking changes

From `docs/ENGINE_SPEC.md`, section 13.

- **Shell tokens removed.** `tokens.color` bg, surface, text, muted, link, and border, and `tokens.font`, `tokens.radius`, `tokens.space`, and `tokens.dark`, are ignored with a build warning. Fix: delete them and keep only `tokens.color.primary`, which now tints the home hero.
- **`topTasks` renamed.** It is read as `quickDownloads` with a build warning. Fix: rename the key in `brand.json`.
- **What's new renamed.** The module id `whats-new` is an alias of `changes` with a build warning, and `/whats-new` redirects to `/changes`. Fix: rename the module in `hub.config.ts`.
- **Routes moved.** `/start`, `/signature`, `/boilerplate`, and `/guide/<rule-id>` redirect to `/guide/new-to-the-team`, `/create/signature`, `/descriptions`, and the rule's chapter page. Fix: none needed; update links you control.
- **Template links replaced by formats.** `url` shows as a single "Open template" button with a build warning, and `fallbackUrl` is ignored. Fix: move a Canva link to `formats.canva` and files to `formats.docx`, `formats.pptx`, or `formats.pdf`, then remove `url` and `fallbackUrl`.
- **Rules need a chapter.** The build fails on a rule without one. Fix: add `guide.chapters` to `brand.json` and a `chapter` from that list to each rule.
- **Pending items leave the public site.** They show only in the editor now. Fix: none needed.

## 0.1.0 (2026-10-23)

First tagged release.

### Public site

- Astro integration `brandHub()` that reads `hub.config.ts`, loads `brands/<slug>/`, and injects one route per enabled module.
- Pages: home (search, top tasks, recent changes), logos, colors, fonts, icons, photos, templates, What's new, and rule pages under `/guide`.
- Search dialog with inline actions (copy hex, download SVG, open template), opened with Cmd or Ctrl+K and `/`.
- Logo background toggle and downloads, color copy tabs (HEX, RGB, CMYK, PMS) and approved pairings, font zips and install steps, icon detail sheet with recolor and PNG export, template category filters.
- Build-time zips for fonts and all logos, and a build-time search index.
- Light and dark themes from brand tokens. Pages load one 2.5 KB (gzipped) shell script, with a 5 KB budget that `pnpm check` enforces; islands load only where needed.
- Template links can point to a page on the same site (`/demo-template/`) as well as to a full web address.

### Brand data

- zod schemas for every data file, with generated JSON Schema files for editor autocomplete.
- Loader checks: schema, unique ids, rule and color references in both directions, file paths, and WCAG 2.2 AA contrast for theme tokens and declared pairings. The build fails with one line per problem.

### Editor

- `/admin`: card grid, inspector, inline rename, reorder, status changes, retire and delete, undo and redo, autosave to IndexedDB, and a leave guard.
- Keyboard: Edit on a card moves focus to the inspector's first field; Escape or Close returns it to the card.
- Uploads with prefill from the file, SVG cleaning, and replace-file with a side-by-side check.
- Serializer: turns edits into validated, stable JSON (sorted keys, two-space indent, trailing newline), applies the brand's file naming pattern, stamps `updated` and `version`, and writes changelog lines. Same input gives byte-identical output.
- Preview of the public pages from the draft, marked "Preview, not live".
- Save draft and Publish through `ContentAdapter`, with plain-language errors and Try again, conflict handling (get their changes or overwrite), and a History panel with Restore.
- Built-in adapters: `local` (writes `brands/<slug>/` under `astro dev` only, history from git) and `demo` (in memory, for the public demo). `docs/ADAPTERS.md` describes how an instance implements its own.

### Demo brand

- Pocket Comet Teapots, a fictional brand: outlined wordmark in Fraunces, seven colors with pairings, Fraunces and Inter (OFL), 66 Bootstrap Icons (MIT) in five groups with a pinned set, three demo templates, a public domain photo source, and rules for every module.

### Package and tooling

- Installs from git with no build step: an `exports` map (`.` and `./adapters`), a `files` list, and no install scripts.
- `pnpm check` (schemas, brand data, copy standards, types), Vitest unit tests, Playwright end-to-end tests (axe on every route in both themes, widths from 320px and 200% zoom, keyboard flow, JS budget), and local adapter tests on a temporary copy of the repo. CI runs all of them.
- `netlify.toml` for the public demo, indexed on production deploys only.
