# Brand Hub

An engine for brand resource sites. It builds a static site of logos, colors, fonts, icons, photos, templates, and brand rules from a folder of brand data, plus an in-site editor for changing that data. One engine serves many brands. Each brand lives in its own instance repository and pins a tagged engine version.

The engine is an [Astro](https://astro.build) integration. Pages are static HTML, rendered from React components at build time. In the browser, React runs only in the search dialog and the editor; the rest is a few small page scripts.

Status: 0.2.0. The engine owns the interface: a neutral shell in light and dark, with its own interface fonts, that every brand gets unchanged. The public site has three parts: Library (home, logos, colors, fonts, icons, photos, templates), Brand guide (rules grouped into chapters), and Create (the email signature, from 0.3). The editor at `/admin` has an Overview, one workspace per section, and Brand settings, and saves and publishes through adapters (`docs/ADAPTERS.md`). The signature, New to the team, the Office theme, and company descriptions arrive in 0.3 and 0.4.

![Home page of the demo brand, Pocket Comet Teapots: the sidebar, the search-first hero over a pale green gradient, and Quick downloads](docs/screenshot.png)

The screenshot shows `brands/demo`, a fictional teapot maker used for development, tests, and the public demo.

## Requirements

- Node.js 22.23.4 or later (the repo runs TypeScript scripts with Node's built-in type stripping)
- pnpm 12, through Corepack: `corepack enable` (or prefix commands with `corepack`, as in `corepack pnpm install`)

## Quick start

```sh
pnpm install
pnpm dev          # http://localhost:4321 with the demo brand; the editor is at /admin
```

The site you see is the engine's shell filled with the data in `brands/demo/`. To change what it shows, edit that data, either in the editor at `/admin` (under `pnpm dev` it writes the files on disk) or by hand:

- `brands/demo/*.json` holds the logos, colors, fonts, icons, templates, photo library, and rules. `files/` holds the files they point to.
- `brands/demo/brand.json` holds the name, the primary color that tints the home hero, the guide chapters, and the Quick downloads row.

Nothing in the brand folder changes the interface itself: colors, type, spacing, and components belong to the engine (see Theming).

## Commands

```sh
pnpm setup-hooks  # once after cloning: points git at .githooks (see "Commit hooks")
pnpm dev          # dev server with the demo brand
pnpm build        # static site in dist/
pnpm check        # schemas, brand data, copy standards, types
pnpm test         # unit tests (Vitest)
pnpm test:e2e     # end-to-end tests against dist/ (run pnpm build first)
pnpm test:local   # local adapter tests: astro dev on a temporary copy of the repo
```

`pnpm test:e2e` runs axe on every route in light and dark, checks for horizontal scroll at 320, 390, 768, and 1440 pixels and at 200% zoom, runs a keyboard-only task flow, and measures home page JavaScript against the 100 KB gzipped budget. It writes the size report to `test-results/js-size.json`. First run: `pnpm exec playwright install chromium`.

The repo runs as its own instance. `hub.config.ts` selects `brands/demo`, a fictional brand used for development, tests, and the public demo.

## How it works

```
hub.config.ts ──► integration ──► loader (schemas + integrity + contrast) ──► virtual:brand-hub ──► pages
                       │
                       └──► one injected route per enabled module, plus /, /guide/<chapter>, /admin,
                            /files/* (brand files), /downloads/*.zip, /search-index.json, and a
                            redirect page (and a dist/_redirects line) for each moved 0.1 route
```

| Path | What it does |
|---|---|
| `src/integration/index.ts` | `brandHub()` Astro integration. Loads `hub.config.ts`, loads the brand, injects routes, serves `virtual:brand-hub` to pages. |
| `src/content/load.ts` | Reads `brands/<slug>/`, validates every file, checks ids, references, chapters, template formats, file paths, and contrast, and reads 0.1 data with a warning for each old key (`src/content/legacy.ts`). Returns locked items for public pages. |
| `src/theme/` | The engine's shell tokens for light and dark, the self-hosted interface fonts, the hero color tuning from `tokens.color.primary`, and the contrast checks. |
| `src/modules/` | One folder per module. `registry.ts` holds each module's route, label, and icon. |
| `src/site/` | The public pages as React components rendered to static HTML: top bar, sidebar, and footer (`Chrome.tsx`), navigation (`nav.ts`), and one component per page. |
| `src/components/` | `Layout.astro`, the page frame, and the asset previews shared with the editor. |
| `src/islands/search/` | The search dialog, loaded the first time search opens. |
| `src/scripts/` | `shell.ts`, the one script on every page (theme switch, frosted top bar, chip row, toasts, copy buttons, search shortcut), and the page scripts: hero gradient and typed hint, font tester, icon picker, template filters. |
| `src/routes/` | Brand files, zip downloads, the search index, and redirect pages, built at build time. |
| `src/styles/global.css` | Base styles and component classes. Reads only shell tokens. |
| `schemas/` | zod schemas for every data file, and the generated JSON Schema files. |
| `brands/demo/` | Demo brand. |
| `scripts/` | `check-copy.mjs`, `check-shell-size.ts`, `validate-brands.ts`, `build-schemas.ts`, `setup-hooks.mjs`. |
| `tests/` | Vitest tests for the loader, theme pipeline, and integration. |

A module left out of `modules` in `hub.config.ts` gets no route, no navigation item, and no search entries. A top tab with nothing in it is hidden: with no signature module, there is no Create tab.

## Brand data

```
brands/<slug>/
  brand.json          name, short name, primary color, guide chapters, quick downloads, module settings
  assets.json         asset records, or split per module: logos.json, colors.json, fonts.json,
                      icons.json, templates.json, photos.json, boilerplate.json,
                      documents.json, signature.json
  rules.json          brand rules, each in one guide chapter
  changelog.json      written by the editor on publish
  files/              logos, fonts, icons, thumbnails, documents
```

The build fails, with one line per problem (file, id, problem), when:

- a file does not match its schema, or a split file holds the wrong asset type
- two records share an id
- a `governedBy`, template `rules`, or color `pairings` id is not an existing rule or color, or a rule's `appliesTo` id is not an existing asset
- a rule's `chapter` is not listed in `guide.chapters`, or a template has none of the four `formats`
- a `quickDownloads` id is not an existing locked asset
- a file path does not exist under the brand folder
- a declared color pairing is below WCAG 2.2 AA (4.5:1 text, 3:1 large text and graphics)

Only `locked` items reach public pages. `pending`, `draft`, and `retired` items stay in the data and show only in the editor.

Run `pnpm validate` to check brand data without building. After changing a zod schema, run `pnpm schemas` to regenerate `schemas/*.schema.json`. `pnpm check` fails while they are stale. `.vscode/settings.json` maps the JSON Schema files to brand files for autocomplete.

## Theming

The engine owns the shell. Surfaces, text, borders, controls, focus, frosted glass, spacing, radius, motion, and layout are engine tokens in `src/theme/`, in light and dark, with names and values from `docs/DESIGN_SYSTEM.md`. The interface is set in Mona Sans, with Martian Mono for values people copy; both are self-hosted. A brand cannot override any of this, so every instance gets the same tested, accessible interface.

The brand shows up as content: its logos, swatches, font specimens, icons, and templates. It sets only two things the shell uses:

```json
{
  "tokens": { "color": { "primary": "#1E5B4A" } },
  "hero": { "tint": null }
}
```

- `tokens.color.primary` gives the home hero gradient its hue. The engine keeps only the hue and builds three pale tones from it, so a loud brand color still gives a soft, legible background (`docs/ENGINE_SPEC.md`, section 10).
- `hero.tint` replaces that tuning with up to three exact colors, for a brand that asks for a specific look. `hero.preset: "contour"` in `hub.config.ts` swaps the gradient for thin contour lines, for palettes that are very loud or nearly gray.

Brand fonts appear only on `/fonts`, in the type tester, and in previews.

## Using the engine in an instance

An instance is a separate, usually private, Astro project that holds one brand's data and its hosting setup.

1. Add the engine at a tagged version:

   ```sh
   pnpm add astro @astrojs/react react react-dom
   pnpm add github:yon-tyzes/brand-hub#v0.2.0
   ```

2. Register the integration in `astro.config.ts`:

   ```ts
   import { defineConfig } from "astro/config";
   import react from "@astrojs/react";
   import { brandHub } from "@yon-tyzes/brand-hub";

   export default defineConfig({ output: "static", integrations: [react(), brandHub()] });
   ```

3. Add `hub.config.ts` at the project root (fields in `docs/ENGINE_SPEC.md`, section 4):

   ```ts
   import { defineHub } from "@yon-tyzes/brand-hub";

   export default defineHub({ brand: "example", modules: ["logos", "colors", "fonts", "icons", "guide", "changes"] });
   ```

4. Add the brand folder at `brands/example/` and run `pnpm build`. Copying `brands/demo/` from this repo is a quick start; its icons and fonts keep the licenses in `THIRD_PARTY.md`. `brand.json` needs `guide.chapters`, and each rule a `chapter` from that list.

The package ships TypeScript source with no build step on either side. Astro bundles packages that list `astro` as a peer dependency, so Vite compiles the engine while it builds the instance. The package exports:

| Import | What it is |
|---|---|
| `@yon-tyzes/brand-hub` | `brandHub()` integration and `defineHub()` |
| `@yon-tyzes/brand-hub/adapters` | `AuthAdapter`, `ContentAdapter`, `ChangeSet`, `Session`, and the `ConflictError` and `AdapterError` classes, for instance adapters |

The engine has no install scripts, because pnpm refuses git-hosted dependencies that run them without an allowlist entry.

## Upgrading an instance from 0.1

Change the pinned tag to `#v0.2.0`, then build. Most 0.1 data still builds and prints one warning per key to change: the shell colors, fonts, radii, and spacing in `brand.json` `tokens` are ignored (keep only `tokens.color.primary`), `topTasks` is read as `quickDownloads`, the `whats-new` module is read as `changes`, and a template `url` shows as a single "Open template" button until it moves to `formats`. One change stops the build: every rule needs a `chapter`, listed in `guide.chapters` in `brand.json`. The 0.1 routes (`/whats-new`, `/start`, `/signature`, `/boilerplate`, `/guide/<rule-id>`) redirect to their new pages.

`docs/ENGINE_SPEC.md`, section 13, lists every change with how the engine handles it.

## Editor

`/admin` is a React app for adding, editing, reordering, and retiring brand items without touching files. It is built when `admin.enabled` is true in `hub.config.ts`.

| Path | What it does |
|---|---|
| `src/admin/ui/` | The app: top bar, sidebar, Overview, the item grid and inspector for each section, Brand settings, dialogs. |
| `src/admin/fields/` | Inspector fields per section: label, one line of help, and the control. Edit these to change what the editor asks for. |
| `src/admin/editor/` | No UI: state and undo history, the change set, validation messages, SVG cleaning, upload handling, autosave. |
| `src/adapters/` | `AuthAdapter` and `ContentAdapter` interfaces, and the built-in `local` and `demo` adapters. |
| `src/serializer/` | Turns the draft into validated, stable brand files and changelog lines. No UI, no network. |

How it works:

- Every edit is a pure function on the draft, kept in an undo history (Ctrl or Cmd+Z, Shift to redo). Typing in one field merges into one undo step.
- `toChangeSet()` turns the draft into the spec's `ChangeSet`: whole data files for each touched file, uploaded files, files nothing points to any more, and one summary line per change. Save runs it through the serializer, which names files, stamps dates and versions, and refuses to save while any item has a problem.
- The draft autosaves to IndexedDB and comes back after a reload if the brand has not changed. Without IndexedDB the editor works and says changes are not kept.
- Uploaded SVG files are cleaned in the browser: scripts, event handlers, embedded web content, and links to outside files are removed. Icons get `currentColor` and a viewBox. The editor lists what it changed.

Preview renders the public pages from the draft in a panel marked "Preview, not live". Save draft and Publish go through the adapters named in `hub.config.ts`. This repo uses `local` under `astro dev`, which writes `brands/demo/` on disk, and `demo` in builds, which keeps changes in memory. Do not publish `/admin` for a real brand with either: implement a server-backed adapter as described in `docs/ADAPTERS.md`.

## Checks and CI

`pnpm check` runs, in order:

1. `build-schemas.ts --check`: JSON Schema files match the zod sources.
2. `validate-brands.ts`: every brand under `brands/` passes the loader.
3. `check-copy.mjs`: copy and markup standards from `docs/STANDARDS.md` in `src`, `docs`, `brands`, and this README.
4. `check-shell-size.ts`: the shared shell script, which loads on every page, stays under 5 KB gzipped.
5. `astro check`: TypeScript and Astro diagnostics.

`.github/workflows/ci.yml` runs `pnpm check`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, and `pnpm test:local` on every push and pull request.

## Demo deployment

`netlify.toml` builds the public demo: `pnpm build` into `dist/`, with the `demo` adapter so the editor needs no server. Production deploys set `BRAND_HUB_INDEXING=true`, which turns on `indexing` in `hub.config.ts`; deploy previews and branch deploys stay `noindex`. Netlify's `URL` variable becomes Astro's `site`, which adds canonical links. The demo's template PDFs are printed by `node scripts/build-demo-templates.ts`.

## JavaScript on pages

Every page loads one small shell script (about 2 KB gzipped, 5 KB budget checked by `pnpm check`) for the theme switch, the frosted top bar, the phone chip row, toasts, copy buttons, and the search shortcut. The search dialog and its index load the first time search opens. The home page loads the hero gradient and the typed search hint after first paint (under 12 KB gzipped). The fonts, icons, and templates pages each add one small script for the type tester, the icon picker, or the filters. Home page JavaScript stays under 100 KB gzipped with search open, which `pnpm test:e2e` measures.

## Commit hooks

`.githooks/commit-msg` rejects commit messages with tool or assistant attribution lines and messages with em dashes. Run `pnpm setup-hooks` once after cloning: it sets `git config core.hooksPath .githooks`. It is not an install script, so instances that install the engine from git run nothing. Do not bypass the hook with `--no-verify`.

## Documentation

- `docs/ENGINE_SPEC.md`: architecture, data model, routes, editor, adapters, roadmap.
- `docs/ADAPTERS.md`: implementing `AuthAdapter` and `ContentAdapter` in an instance, with a git-hosting outline.
- `docs/DESIGN_SYSTEM.md`: layout, type scale, spacing, shape, components, motion.
- `docs/STANDARDS.md`: copy and visual standards, enforced in part by `pnpm check`.

## License

MIT. See `LICENSE`. The demo brand's icons (Bootstrap Icons, MIT) and fonts (Inter and Fraunces, SIL Open Font License 1.1) keep their own licenses, listed in `THIRD_PARTY.md`.
