# Changelog

Versions follow [Semantic Versioning](https://semver.org). Instances pin a tag, for example `github:yon-tyzes/brand-hub#v0.1.0`.

## 0.3.0 (2026-11-05)

### Email signature

- `/create/signature` builds when `signature` is in `modules` and `signature.json` has a design (ENGINE_SPEC.md, section 14). Pick a design and color, fill in the form, see a live preview, and copy the signature as rich HTML with a plain text fallback. Install steps for three Outlook versions follow the preview.
- `headshot` takes `true` (a 72px circle) or `{ "shape": "circle" | "rect", "width", "height" }`. The photo is cropped in the browser to the design's shape, drawn at twice the display size, and embedded in the copied signature. It is never uploaded.
- Templates gain `{{href.<field-id>}}` for `mailto:`, `tel:`, and url links. Every value is escaped, url fields keep only http and https, and image paths become absolute from the site address.
- New shell token `paper`, white in both themes, behind the signature preview.
- The demo turns the signature page on and adds a second design, Compact.

### New to the team

- `/guide/new-to-the-team` lists the steps from `onboarding.json` in order, numbered. Each link reads as the label of the asset or module it opens; links to a module that is off or an asset not on the site are left out. Home shows one entry to the page below Quick downloads, and search lists it in the Brand guide group.

### Office theme

- With `modules.office` in `brand.json`, the build writes `/downloads/<theme-name>-office-theme.thmx` with the twelve theme colors, the heading and body fonts, and a thumbnail drawn from the palette. Two builds of the same data give the same bytes. `/office` shows the colors in slot order, both fonts, the download with its date and size, and install steps for Windows and Mac. `/colors` and `/fonts` end with the download and one line per platform on how to apply it. Search lists it under Office, Word, PowerPoint, Excel, and theme.
- The loader warns when two adjacent accents in `modules.office` differ by less than 15 in CIELAB delta E, since charts use them as neighboring series.

### Gradient colors

- `colors.json` takes records with `type: "gradient"`. `stops` holds two or more hex values in order; a stop may set `at`, its position from 0 to 100, on every stop or on none, and positions must not go down. `angle` is in degrees, 0 to 360, default 90 (left to right). Stops are hex values, not color ids, because a brand gradient may pass through tones that are not palette colors.
- `/colors` shows each gradient as a card after the colors: its stops in order as solid swatches, each with its hex, and a "Copy CSS" action that copies a `linear-gradient()` value. Search lists gradients in the Colors group with the "Copy CSS" action.
- The demo adds one gradient, Ink to Mist.

### Modules

- A module whose page is built from brand data stays off until the brand has that data, even when it is listed: `office` needs `modules.office` in `brand.json`, `start` needs `onboarding.json`, `signature` needs `signature.json`, and `boilerplate` needs a locked boilerplate record.

## 0.2.3 (2026-10-30)

Four fixes to the public site. No data or config changes: 0.2.2 instances build unchanged.

### Public site

- Download labels: logo and icon download buttons, on `/logos`, `/icons`, and in Quick downloads, read "Download" with the format beside it. Visually hidden text names the asset, so each button keeps its own accessible name: "Download Stacked logo, PNG". The hero's logo chip shows the logo's label.
- Copy hex code: each color card on `/colors` has a quiet secondary button, "Copy hex code", with no fill, a `border-control` boundary, and the copy icon. It copies the hex and shows the same confirmation as clicking the hex, which stays clickable.
- Icon search: a query now shows one flat grid of matching icons across all groups, matched on name, id, and keywords, case-insensitive and on partial words. Before, a query hid every icon and left only the group headings. A count reads `4 icons match "arrow"`, a query with no match says so, and Escape or "Clear search" restores the groups. The browser's own clear button is hidden in that field.
- Icon color chips: each chip is drawn in its own pair, the icon color on the ground, so the bar reads as the palette. The chosen chip shows a check icon and a 2px ring. When the icon color is under 4.5:1 on its ground, the chip keeps the ground and the icon color (for a dot and the check) and sets its text in the darkest shell text value that reaches 4.5:1.

## 0.2.2 (2026-10-30)

Six optional additions: a brand guide PDF, font groups, web font files, calm motion, template variants, and an editor kept to local dev. No breaking changes: 0.2.1 instances build unchanged. The one new warning is for fonts with WOFF2 files only.

### Public site

- Brand guide PDF: with `guide.pdf` set, `/guide` shows one secondary button, "Open the full guide (PDF, 145 KB)", with the size read at build time. It opens the PDF in a new tab in the browser's own viewer. Search lists it as "Brand guide (PDF)".
- Font groups: with `modules.fonts.groups` set, `/fonts` shows one section per group, in order, with its title, help line, and a "Download all" zip that holds one folder per family with its license. Without groups the page is unchanged.
- `/fonts` says that Word, PowerPoint, and Excel need the TTF or OTF files, and that WOFF2 files are for websites.
- Template variants: a template card with variants shows a row of labeled chips on native radio inputs. Picking one, by pointer or arrow keys, swaps the thumbnail and, when the variant has its own formats, the buttons. No script. The first variant stands for the template on the home page and in search.
- Calm motion: `motion: "calm"` in `hub.config.ts` turns off the hero animation (the static gradient shows and the hero script is not loaded), the pointer light, page transitions and the sliding indicator, the typed search hint (the first example shows, still), and the icon recolor wave. Copy confirmations, the download arrow, press feedback, focus states, and dialog and toast motion stay. It uses the reduced-motion path: one still condition, reduced motion or calm.

### Editor

- Brand settings gains a "Brand guide PDF" slot and a "Font groups" list (add, rename, help line, reorder, remove a group no font uses).
- The font inspector gains a group select and a web files slot. Font files help now says the download takes TTF or OTF files.
- The template inspector gains a Variants list: add a variant from its thumbnail, rename, reorder, remove, and give it its own Canva link or files.
- `admin.enabled: "dev"` keeps the editor to `astro dev`. A production build then ships no `/admin` route, no editor JavaScript, and no editor search entries.

### Data

- `brand.json`: optional `guide.pdf` `{ path, updated }`. The build fails if the file is missing.
- `brand.json`: optional `modules.fonts.groups`, a list of `{ id, title, help? }`. Fonts gain optional `group`. The build fails on an unknown group id, or on a font with no group once groups are set, and names the font.
- Fonts: `files` gains optional `web[]` (WOFF2). `@font-face` uses it when present, else the 0.2.1 behavior. Download zips hold `static[]` and `variable[]` only. The build warns when a font has WOFF2 files but no static TTF or OTF: `font "<id>" has only WOFF2 files, so it cannot be installed in Word.`
- Templates: optional `variants[]` of `{ id, label, thumbnail, formats? }`, up to eight. A variant without `formats` uses the template's. Every variant file must exist, and variant ids must be unique.
- `hub.config.ts`: optional `motion: "full" | "calm"` (default `"full"`), and `admin.enabled` accepts `"dev"` beside `true` and `false`.
- Demo brand: a fictional guide PDF (`scripts/build-demo-guide.ts`), static TTF files for Inter and Fraunces from their upstream releases with the WOFF2 files moved to `web[]`, two font groups (Headings and Text), and a letterhead in Comet Green and Ink. Fraunces upstream has no static 500, so its demo weights are now 400 and 600.

## 0.2.1 (2026-10-25)

A polish release: glass that reads over the hero gradient, icons and logos that work in dark mode, and small interface motions. No breaking changes.

### Fixes

- Logo previews take their ground from the logo's `background` field in both themes. Light logos sit on a fixed light ground (`#f5f6f8`) in dark mode too, on the home page, `/logos`, search results, guide examples, and in the editor.
- The hero keeps the brand hue in dark mode: tones now move about 60% toward the background instead of 80%.
- The animated hero mesh draws above the static gradient. In 0.2.0 the canvas sat underneath it, so only the static gradient showed.
- The search dialog's full-width blue focus line is gone. The input row's bottom border and the search icon show focus instead.
- Save draft and Publish in the editor are never disabled. With nothing to do they say "No changes to save." or "Nothing to publish yet." This applies in the top bar and on the Overview.

### Design

- Hero glass: a lighter fill with a stronger edge and a shadow tinted with the brand hue (`--hero-shadow`), over a fourth pool of color behind the search field and chips. The gradient fades under the title only. The static gradient and the contour preset use the same layout. The search hint now uses `text-secondary` so it keeps 4.5:1 over the mesh.
- A pointer light follows the mouse inside the hero search field, on fine pointers only, and is off under reduced motion and reduced transparency.
- Icon color choices are brand pairs, an icon color on a ground ("Kiln White on Ink"), offered only at 3:1 or better. The grid sits on a panel filled with the pair's ground, each theme opens on a pair that suits it, and a picked pair is remembered. Changing the pair recolors the grid in a short wave.
- Brand settings in the editor gain "Icon colors" and "Icon backgrounds".
- Micro-interactions, all 120 to 320ms and instant under reduced motion: a success flash on copied rows, a check on copy buttons in search (the dialog now stays open after a copy), a download arrow that dips and drops, color previews that grow on hover, page transitions with a sliding tab underline and sidebar item, a turning theme toggle, and a press scale on buttons and chips.

### Data

- `brand.json`: new optional `modules.icons.grounds`, a list of color ids for icon backgrounds. Without it, the lightest and darkest locked colors are used. The loader reports ids that do not exist.
- Demo brand: icon colors are Ink, Comet Green, Copper, and Kiln White, on Kiln White, Ink, and Comet Green.

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
