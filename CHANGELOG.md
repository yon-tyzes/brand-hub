# Changelog

Versions follow [Semantic Versioning](https://semver.org). Instances pin a tag, for example `github:yon-tyzes/brand-hub#v0.1.0`.

## 0.1.0 (2026-10-23)

First tagged release.

### Public site

- Astro integration `brandHub()` that reads `hub.config.ts`, loads `brands/<slug>/`, and injects one route per enabled module.
- Pages: home (search, top tasks, recent changes), logos, colors, fonts, icons, photos, templates, What's new, and rule pages under `/guide`.
- Search dialog with inline actions (copy hex, download SVG, open template), opened with Cmd or Ctrl+K and `/`.
- Logo background toggle and downloads, color copy tabs (HEX, RGB, CMYK, PMS) and approved pairings, font zips and install steps, icon detail sheet with recolor and PNG export, template category filters.
- Build-time zips for fonts and all logos, and a build-time search index.
- Light and dark themes from brand tokens. Pages load one 2.5 KB (gzipped) shell script; islands load only where needed.
- Template links can point to a page on the same site (`/demo-template/`) as well as to a full web address.

### Brand data

- zod schemas for every data file, with generated JSON Schema files for editor autocomplete.
- Loader checks: schema, unique ids, rule and color references in both directions, file paths, and WCAG 2.2 AA contrast for theme tokens and declared pairings. The build fails with one line per problem.

### Editor

- `/admin`: card grid, inspector, inline rename, reorder, status changes, retire and delete, undo and redo, autosave to IndexedDB, and a leave guard.
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
