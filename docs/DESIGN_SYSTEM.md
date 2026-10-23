# Design system

This document defines the layout, type, spacing, shape, components, and motion of the Brand Hub engine. Components read every visual value from CSS custom properties. A brand changes values in `brand.json` (see `ENGINE_SPEC.md`, section 9). It never changes components or the structure described here.

Conventions:

- Sizes are given in px for reading. Ship them as `rem` (16px base).
- Media queries are mobile first (`min-width`).
- "Derived" tokens are computed by the token pipeline from brand tokens with `color-mix()`. A brand may override any of them.

## Tokens at a glance

| Group | Tokens | Source |
|---|---|---|
| Color | `--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-primary`, `--color-link`, `--color-border` | brand |
| Color, derived | `--color-surface-2`, `--color-border-strong`, `--color-on-primary`, `--color-primary-hover`, `--color-focus`, `--color-scrim` | pipeline |
| Font | `--font-display`, `--font-body` | brand |
| Font, engine | `--font-mono` | engine (system stack) |
| Type | `--step--2` to `--step-7`, `--leading-*`, `--tracking-*`, `--weight-*` | engine, ratio from this doc |
| Space | `--space-1` to `--space-9` | brand (`space` array) |
| Radius | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-control` | brand (`radius`), `control` defaults to pill |
| Shadow | `--shadow-sm`, `--shadow-lg` | pipeline, from `--color-text` |
| Motion | `--duration-fast`, `--duration-base`, `--ease-out`, `--ease-in-out` | engine |
| Layout | `--content-max`, `--gutter`, `--header-h`, `--header-offset` | engine |

Derived color defaults:

```css
--color-surface-2:     color-mix(in oklab, var(--color-surface), var(--color-text) 4%);
--color-border-strong: color-mix(in oklab, var(--color-border), var(--color-text) 25%);
--color-primary-hover: color-mix(in oklab, var(--color-primary), var(--color-surface) 14%);
--color-on-primary:    var(--color-surface);
--color-focus:         var(--color-link);
--color-scrim:         color-mix(in oklab, var(--color-text) 45%, transparent);
--font-mono:           ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

The pipeline checks contrast at build time and fails when `--color-on-primary` on `--color-primary` is below 4.5:1, `--color-muted` on `--color-bg` or `--color-surface` is below 4.5:1, or `--color-focus` against `--color-bg` is below 3:1. The checks run for light and dark tokens.

## 1. Layout

### Breakpoints

| Name | Min width | Changes at this width |
|---|---|---|
| base | 0 | One column. Gutter 16. Menu button. |
| `sm` | 480 | Type ratio steps up. Two-column card grids. |
| `md` | 768 | Gutter 24. Three-column card grids. Section heads go side by side. Section padding steps up. |
| `lg` | 992 | Inline navigation replaces the menu button. Gutter 64. Sidebar and split layouts go side by side. Footer goes to four columns. |

Above `lg` the layout only grows until the content frame reaches its maximum. Nothing else changes.

### Container

```
| gutter |            content frame (max 1200)            | gutter |
```

- `--content-max: 1200px`. The frame is centered with `margin-inline: auto`.
- `--gutter`: 16 (base), 24 (`md`), 64 (`lg`). It is applied as `padding-inline` on the page wrapper, so the frame never touches the viewport edge.
- Full-bleed elements (header bar, footer border) span the viewport. Their content still aligns to the frame.
- Reading width for long text (guide pages, install steps, FAQ answers): `max-width: 68ch`.

### Grid

A 12-column grid inside the content frame. Column gap is `--space-5` (24) from `md`, `--space-4` (16) below. Named layouts:

| Layout | base | `sm` | `md` | `lg` | Used for |
|---|---|---|---|---|---|
| `cards-3` | 1 | 1 | 3 | 3 | Module cards on home, rule cards |
| `cards-4` | 1 | 2 | 3 | 4 | Template cards, logo cards, font family cards |
| `swatches` | 2 | 3 | 4 | 6 | Color swatches |
| `icons` | `auto-fill, minmax(88px, 1fr)` at every width | | | | Icon library |
| `split` | stack | stack | stack | 5 / 7 | Text beside a preview (logo helper, signature generator) |
| `sidebar` | stack | stack | stack | 4 / 8 | Intro beside a list (FAQ, install help, rules index) |
| `cells-2` | 1 | 2 | 2 | 2 | Do and don't rule grids. Shared 1px borders, no gap. |

Card grids stack vertically on small screens. They never become horizontal scroll strips, because a strip hides assets behind a gesture.

### Section rhythm

| Spacing | base | `md` | `lg` |
|---|---|---|---|
| Section padding (block) | 48 (`--space-7`) | 64 (`--space-8`) | 96 (`--space-9`) |
| Section head to content | 32 (`--space-6`) | 32 | 48 (`--space-7`) |
| Between blocks in a section | 24 (`--space-5`) | 32 | 32 |
| Page top, below the header | `--header-h` + `--header-offset` + 32 | same | same + 16 |

Sections are separated by space alone. No alternating background bands and no inverted (dark in light) sections.

**Section head:** an `h2` plus at most one secondary or text button. It stacks below `md` with a 16 gap. From `md` the heading sits left and the action right, aligned to the heading's last baseline, with a 40 gap. An optional one-line intro in `--color-muted` sits under the heading. Nothing sits above the heading.

## 2. Type scale

Two families, both brand tokens: `--font-display` for headings and `--font-body` for everything else. `--font-mono` is an engine stack for values people copy (HEX, RGB, file names, keyboard shortcuts) and for code. It is never used for labels or decoration.

### Ratio

Sizes follow `16 x ratio^step`. The ratio grows with the viewport, so headings scale while body sizes stay put.

| Viewport | Ratio |
|---|---|
| base (0 to 479) | 1.125 |
| `sm`, `md` (480 to 991) | 1.15 |
| `lg` (992 and up) | 1.2 |

Steps -2 to 0 are fixed. They do not shrink on small screens.

| Step | base | `sm`/`md` | `lg` |
|---|---|---|---|
| `--step-7` | 36 | 43 | 57 |
| `--step-6` | 32 | 37 | 48 |
| `--step-5` | 29 | 32 | 40 |
| `--step-4` | 26 | 28 | 33 |
| `--step-3` | 23 | 24 | 28 |
| `--step-2` | 20 | 21 | 23 |
| `--step-1` | 18 | 18 | 19 |
| `--step-0` | 16 | 16 | 16 |
| `--step--1` | 14 | 14 | 14 |
| `--step--2` | 12 | 12 | 12 |

The token pipeline writes the computed `rem` values per breakpoint, rounded to two decimals. Components never call `pow()` themselves.

### Roles

| Role | Element | Step | Family | Weight | Line height | Tracking | Color |
|---|---|---|---|---|---|---|---|
| Home title | `h1` on `/` | 7 | display | `--weight-display` | 1.05 | -0.03em | text |
| Page title | `h1` | 6 | display | `--weight-display` | 1.08 | -0.025em | text |
| Section heading | `h2` | 5 | display | `--weight-display` | 1.12 | -0.025em | text |
| Subsection | `h3` | 3 | display | `--weight-display` | 1.2 | -0.015em | text |
| Minor heading | `h4` | 2 | body | 500 | 1.3 | -0.01em | text |
| Card title | `h3` in card | 0 | body | 500 | 1.5 | 0 | text |
| Lead | `p.lead` | 1 | body | 400 | 1.55 | 0 | muted |
| Body | `p`, `li` | 0 | body | 400 | 1.55 | 0 | text |
| Small | help text, card body, meta | -1 | body | 400 | 1.55 | 0 | muted |
| Caption | dates, file sizes, version | -2 | body | 500 | 1.4 | 0.01em | muted |
| Button | `.btn` | 0 | body | 500 | 1.5 | 0 | per variant |
| Button, small | `.btn-sm` | -1 | body | 500 | 1.5 | 0 | per variant |
| Nav link | header link | -1 | body | 500 | 1.5 | 0 | text |
| Mobile menu link | menu row | 1 | body | 500 | 1.4 | 0 | text |
| Tab | tab button | -1 | body | 500 | 1.4 | 0 | muted, active text |
| Pill | filter | -1 | body | 500 | 1.4 | 0 | text |
| Tag | changelog tag | -2 | body | 600 | 1.3 | 0.02em | text |
| Value | HEX, RGB, file name | -1 or 0 | mono | 400 | 1.5 | 0 | text |
| Footer heading | column `h2` | -1 | body | 600 | 1.4 | 0 | text |
| Footer link | column link | -1 | body | 400 | 1.5 | 0 | muted, hover text |

- `--weight-display` defaults to 500. A brand whose display face is heavy may set 400. Body weights are 400, 500, 600 only.
- Text is sentence case everywhere. `text-transform: uppercase` is not used on any role.
- Use `font-variant-numeric: tabular-nums` on values, dates, sizes and table cells.
- Headings use `text-wrap: balance`. Body uses `text-wrap: pretty`.

## 3. Spacing scale

The scale is the brand's `space` array, exposed as `--space-1` to `--space-9`. Engine defaults:

| Token | px | Typical use |
|---|---|---|
| `--space-1` | 4 | Title to description inside a row, icon to label in a tag |
| `--space-2` | 8 | Gap between pills, between buttons in a group, card stack gap |
| `--space-3` | 12 | Icon tile to text, menu row padding, input padding block |
| `--space-4` | 16 | Card padding below `sm`, grid gap below `md`, gutter at base |
| `--space-5` | 24 | Card padding, grid gap from `md`, gutter at `md` |
| `--space-6` | 32 | Panel padding, section head to content below `lg` |
| `--space-7` | 48 | Section padding at base, section head to content at `lg` |
| `--space-8` | 64 | Section padding at `md`, gutter at `lg` |
| `--space-9` | 96 | Section padding at `lg` |

Rules:

- Components use only scale tokens. One exception is the border width (1px) and focus ring (2px).
- Vertical rhythm comes from `gap` on flex and grid parents, not from margins on children.
- Hit areas grow with padding, never with margins.

## 4. Shape

### Radius

| Token | Default | Used for |
|---|---|---|
| `--radius-sm` | 6 | Tabs, tags, inline code, checkbox |
| `--radius-md` | 10 | Icon tiles, inputs, menu rows, toasts, table container |
| `--radius-lg` | 16 | Cards, dropdown panel, mobile menu, dialog, sheet corners |
| `--radius-control` | 999 | Buttons, pills, theme switch, FAQ toggle |

Nested radii: an element inside a padded container uses the container radius minus the padding, with a floor of `--radius-sm`.

### Borders

- Width 1px, style solid, color `--color-border`. Hover and selected states use `--color-border-strong`.
- Separation between list items is a top border on each item after the first. No standalone divider elements.
- Grids of cells (`cells-2`) share borders. Each cell draws its right and bottom border, and the grid draws top and left.

### Shadows

Only layers that float above the page get a shadow. Cards, tiles and buttons do not.

```css
--shadow-sm: 0 1px 3px color-mix(in oklab, var(--color-text) 8%, transparent);
--shadow-lg: 0 16px 40px color-mix(in oklab, var(--color-text) 8%, transparent);
```

| Layer | Shadow |
|---|---|
| Theme switch knob, active tab | `--shadow-sm` |
| Dropdown panel, mobile menu, toast, search dialog, sheet | `--shadow-lg` |

In the dark theme shadows stay as defined. The border carries the edge.

### Surfaces

| Surface | Fill | Border |
|---|---|---|
| Page | `--color-bg` | none |
| Card, panel, dialog, sheet, menu | `--color-surface` | `--color-border` |
| Preview area inside a card, icon tile, hover fill, switch track | `--color-surface-2` | none or `--color-border` |

No transparency, blur, or gradient fills on any surface.

## 5. Components

Every interactive component meets these rules. They are not repeated per component:

- **Focus:** `outline: 2px solid var(--color-focus); outline-offset: 2px` on `:focus-visible`. It is the same on every control, in both themes. Controls never set `outline: none` without this replacement.
- **Target size:** at least 24x24 CSS px. Buttons and rows are 40 or taller.
- **Keyboard:** everything reachable with Tab and operable with Enter or Space. Composite widgets (tabs, menus) also use arrow keys as noted.
- **Disabled:** `opacity: 0.5`, `cursor: not-allowed`, and `aria-disabled="true"` when the control must stay focusable.

### Header

- Sticky at the top with an offset (`--header-offset`: 12 below `lg`, 16 from `lg`). It is a bar inside the gutter, `--header-h: 56px`. It holds `--color-surface`, a 1px border, `--radius-control` and no shadow.
- Contents, left to right:
  - Brand mark (links to `/`).
  - At `lg` and up, module nav links, with a gap of `--space-5`.
  - Search button (icon plus `Ctrl K` hint from `lg`).
  - Theme toggle.
- Below `lg`: brand mark, search button, menu button. The theme toggle moves into the mobile menu.
- Nav links: step -1, weight 500, `--color-text`. The current page has `aria-current="page"` and a 2px underline in `--color-text` offset 6px. On hover the color changes to `--color-link`. Vertical padding gives each link a 40px hit area.
- `scroll-padding-top` on `html` equals `--header-h` + `--header-offset` + 16 so anchored headings are not hidden.

### Dropdown menu (module menu)

- Trigger: a `button` with `aria-expanded` and `aria-controls`, and a chevron that rotates 180 degrees when open. It opens on click and on Enter, Space, or Down arrow. Hover alone does not open it.
- Panel:
  - Placed 8px below the header and aligned to the content frame, with the frame's width at `lg` and up.
  - Padding `--space-6`, `--radius-lg`, 1px border, `--shadow-lg`, `--color-surface`.
- Layout: two column groups with a gap of `--space-6`.
  - **Module rows** (left, wider): icon tile (40), label (step 0, 500), and a one-line help text (step -1, muted). Each row has padding `--space-3`, `--radius-md`, and a gap of `--space-3`. Hover and focus fill the row with `--color-surface-2`.
  - **Quick links** (right): plain links, step -1, with a row gap of `--space-3`.
- A group may have a heading (step -1, weight 600, `--color-text`) when there is more than one group. It is a real heading for the list, not a label above another heading.
- Close on Escape (focus returns to the trigger), on outside click, and when focus leaves the panel. The arrow keys move between rows.
- No promotional or "featured" card in the panel.

### Mobile menu

- Below `lg`, the menu button (40x40, `--radius-control`, `aria-expanded`) opens a panel. The panel drops from the header, keeping the header's horizontal inset. Its max height is `100dvh` minus the header, and it scrolls internally.
- Panel: `--color-surface`, 1px border, `--radius-lg`, `--shadow-lg`, padding `--space-5` inline and `--space-3` block.
- Rows: step 1, weight 500, at least 54px tall, with a top border between rows. Links show a trailing arrow. Groups (such as a module group) expand inline with a plus that turns into a minus, using a `button` with `aria-expanded`.
- Below the rows: a theme row ("Theme" label left, switch right).
- The page behind does not scroll while the menu is open. Escape closes it and returns focus to the menu button.

### Theme toggle

- Switch: track 64x34, padding 3, `--color-surface-2`, `--radius-control`. Knob 28x28 with `--color-surface`, 1px border, `--shadow-sm`. Sun and moon glyphs sit at 16px inside the track. The knob slides with `transform` over `--duration-base`.
- Markup: `button` with `role="switch"`, `aria-checked`, and an accessible name of "Dark theme".
- Sets `data-theme="dark"` on `html`. The choice is stored in `localStorage` and applied by a small inline script in `head` before first paint. When no choice is stored, the site uses light (spec section 6).
- Dark tokens come from the brand. When a brand has no dark tokens, the toggle is not rendered.

### Buttons

| Variant | Fill | Text | Border | Hover |
|---|---|---|---|---|
| Primary | `--color-primary` | `--color-on-primary` | same as fill | fill `--color-primary-hover` |
| Secondary | `--color-surface` | `--color-text` | `--color-border` | fill `--color-surface-2`, border `--color-border-strong` |
| Text | none | `--color-text` | none | text `--color-link`, underline |

- Sizes: default 48 tall with padding 12 block and 20 inline at step 0. Small is 40 tall with padding 8 and 14 at step -1. The radius is `--radius-control`.
- Icon plus label gap: `--space-2`. Icons are 16 (small) or 20 (default) and use `currentColor`.
- Full width below `sm` when a button stands alone in a section. Button groups use a gap of `--space-2` and wrap.
- One primary button per view. Labels say what happens ("Download SVG", "Copy hex").
- Text button with an arrow (for "All icons" style links) adds a trailing arrow glyph. The arrow does not move on hover.

### Card

- `--color-surface`, 1px `--color-border`, `--radius-lg`, padding `--space-5` (`--space-4` below `sm`). Internal stack gap is `--space-2`.
- Anatomy, top to bottom:
  - **Preview area** (optional): `--color-surface-2`, radius `--radius-lg` minus padding, fixed aspect ratio per module (logos 3:2, templates 4:3, fonts 2:1). It shows the real asset.
  - **Title:** step 0, weight 500.
  - **Description:** step -1, muted, two lines max with `line-clamp`.
  - **Footer row** (optional): caption meta left, small actions right.
- Linked card: the title link's `::after` covers the card, so the whole card is clickable while only the title is announced. The focus ring goes around the card (`:has(:focus-visible)`). On hover the border becomes `--color-border-strong`, with no lift and no shadow.
- Inner actions (download buttons) sit above the cover link (`position: relative; z-index: 1`).

### Icon tile

- 40x40, `--radius-md`, `--color-surface-2`, 1px `--color-border`, with a centered 20px icon in `--color-text`. The dense variant is 32x32 with a 16px icon.
- Used in module rows, module cards, search results, and feature lists (icon tile, then title and one line of text, with a gap of `--space-3`).
- Icons only. No numbers, letters, emoji, or decorative marks.

### Tabs (copy-format tabs)

- Segmented control: the list has a `--color-surface-2` track, padding 4, and `--radius-md`. Each tab is 32 tall with padding 6 and 12, `--radius-sm`, at step -1, weight 500, `--color-muted`.
- The selected tab gets `--color-surface` fill, `--color-text`, and `--shadow-sm`. Hover on an unselected tab changes its text to `--color-text`.
- ARIA tabs pattern: `role="tablist"`, `tab`, `tabpanel`. Left and Right arrows move the selection, and Home and End jump. Selection follows focus.
- The panel shows the value in `--font-mono` with a copy button. Format order is SVG, PNG, HEX, RGB. Formats an asset does not have are left out, not disabled.
- The selected format is remembered per viewer for the session.

### Pill filters

- Filter group: `role="group"` with an accessible name, pills wrap with a gap of `--space-2`.
- Pill: a `button` with `aria-pressed`, 40 tall, padding 8 and 14, `--radius-control`, at step -1, weight 500.
  - Unpressed: `--color-surface` fill, `--color-border`, `--color-text`. Hover changes the border to `--color-border-strong`.
  - Pressed: `--color-text` fill and border, with `--color-bg` text, plus a 16px check icon before the label.
- An optional count follows the label in muted (or `--color-bg` at 70% when pressed), with tabular figures.
- "All" is the first pill and clears the others. The result count updates in a polite live region.

### Changelog entry

A row in a list, not a boxed card, so many entries scan quickly.

- Grid: date column (96px at `md` and up, stacked above the rest below `md`), then the main column, then a trailing arrow when the entry links to an asset. Each row has padding `--space-5` block and `--space-3` inline, with a top border after the first row.
- Date: caption role, `<time datetime>`.
- Main column: tag(s), then the title (step 0, weight 500), then an optional detail line (step -1, muted). Gap `--space-1`.
- Tag: `Added`, `Updated`, or `Retired`. Each is 22 tall with padding 0 and 8, `--radius-sm`, and a 1px border, at step -2, weight 600. All three use `--color-text` on `--color-surface`. `Retired` uses `--color-muted` text. Meaning is carried by the word, not by color.
- Hover on a linked row fills `--color-surface-2`.
- The "In progress" list on What's new uses the same row without the arrow. It carries the plain-text status "In progress" in the tag position.

### FAQ accordion

- Native `details` and `summary`, so the fonts and signature pages ship no JS for it.
- Item: top border after the first, padding `--space-5` block.
- Summary: question at step 1, weight 500, on the left. The toggle on the right is 40x40, `--radius-control`, 1px border, with a plus icon. The vertical bar rotates 90 degrees on open over `--duration-base`, making a minus. Hover changes the question color to `--color-link`. The default marker is hidden.
- Answer: step 0, `--color-text`, max 68ch, with padding-top `--space-3`. Install steps inside use an ordered list.
- Layout: `sidebar`, with an intro (heading, one line, one text button) left and items right at `lg`. Stacked below.
- The open and close height changes are not animated.

### Footer columns

- A full-bleed top border, padding-top `--space-8` (`--space-7` below `md`), padding-bottom `--space-7`.
- Top row: a brand column (mark, plus the brand's one-line description from `brand.json` if present), then link columns.
  - Columns go 2 up below `lg` and 4 up at `lg`, with a 160px minimum width, a column gap of `--space-5`, and a row gap of `--space-6`.
  - From `lg`, the brand column takes 4 of 12 grid columns and the link columns take 8.
- Column: an `h2` (footer heading role), then a list of links with a row gap of `--space-1`. Each link has at least a 32px hit area.
- Columns: module links, brand contact (from `brand.json`), and resources (What's new, guide).
- Bottom row (top border, padding-top `--space-5`): engine version and last publish date in the caption role. No credit lines.

### Toast

- A single region, `role="status"` with `aria-live="polite"`, fixed at the bottom center below `md` and the bottom right from `md`, with a 16px inset.
- Toast: `--color-surface`, 1px border, `--radius-md`, `--shadow-lg`, padding 12 and 16, max width 360. It holds a 20px check icon and a message at step -1.
- The message names the thing copied: "Navy hex #0F3D6B copied."
- One toast at a time. A new one replaces the old. It auto-hides after 4 seconds, and the timer pauses while the toast is hovered or focused. It enters with an opacity fade and 4px rise over `--duration-fast`.

### Search dialog

- Native `dialog` opened with `showModal()` from the header button, Ctrl or Cmd plus K, or `/`. The backdrop is solid `--color-scrim`, with no blur.
- From `md`: width `min(640px, 100% - 2 * var(--gutter))`, top 12vh, `--radius-lg`, 1px border, `--shadow-lg`, `--color-surface`. Below `md`: full screen, radius 0.
- Input row: 56 tall, a 20px search icon, input text at step 1, with Esc hint keys on the right. The bottom border separates it from the results.
- Results: grouped by module, with group headings (step -1, weight 600) and padding `--space-3`.
  - Each result row is 48 or taller, with a dense icon tile (32), then a label and help line, then inline actions (small secondary buttons such as "Copy hex" and "Download SVG").
  - The active row has `--color-surface-2` fill.
- Combobox pattern: Up and Down arrows move the active row, Enter runs the primary action, Esc closes, and focus returns to the opener.
- Empty state: one line naming the query, and no suggestions invented to fill space.

### Sheet (side panel)

- Used for icon detail, template rules, and the admin inspector. Native `dialog`, modal on the public site.
- From `md`: anchored right, full height, width `min(480px, 100%)`, `--color-surface`, a 1px left border, and `--shadow-lg`. The top-left and bottom-left corners use `--radius-lg` when inset by `--space-2`. Below `md`: full screen.
- Header: 64 tall, padding `--space-5` inline, with the title (step 2, `h2`) and a 40x40 close button (secondary, icon only, labeled "Close"). Bottom border.
- Body scrolls on its own with padding `--space-5`. An optional sticky footer holds actions, with a top border.
- Enters with translateX(16px) to 0 plus a fade over `--duration-base`. Focus moves to the title on open and returns to the opener on close.

### Data table

- Used for color values, font weights and styles, and the admin item list.
- Container: 1px border and `--radius-md`. It scrolls horizontally inside the container (`overflow-x: auto`, `tabindex="0"`, labeled) when wider than the frame, and the page never scrolls sideways.
- Header row: `--color-surface-2`, step -1, weight 600, `--color-muted`, `th scope="col"`, padding 12 and 16.
- Body rows: at least 48 tall, padding 12 and 16, step -1, with a top border between rows. Values use `--font-mono`, numbers use tabular figures and are right aligned.
- The first column is sticky on horizontal scroll below `md`.
- Row actions sit in the last column as small text or secondary buttons. No zebra stripes.

## 6. Motion

Motion responds to input only. Nothing animates on load or on scroll, except a loading indicator.

| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 120ms | Color, fill, and border changes on hover and press. Toast enter. |
| `--duration-base` | 200ms | Panels opening, theme knob, FAQ icon, sheet, chevrons |
| `--ease-out` | `cubic-bezier(0.215, 0.61, 0.355, 1)` | Anything entering or opening |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Movement between two resting states (knob, tab indicator) |

- No duration exceeds 200ms.
- Transition named properties only (`color`, `background-color`, `border-color`, `opacity`, `transform`). Never `all`.
- Dropdown and mobile menu open with opacity 0 to 1 and translateY(-4px) to 0 over `--duration-base` `--ease-out`. They close at `--duration-fast` with no movement.
- Exits are faster than entrances.
- No parallax, scroll-linked effects, reveal-on-scroll, looping animation, or animated counters.

Reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
```

With `reduce`, panels and sheets appear in place and only color and opacity state changes remain visible as instant swaps. Loading indicators switch to a static "Loading" label.

## 7. Pattern mapping

| Reference pattern | Keep | Hub use |
|---|---|---|
| Header, dropdown menu, theme toggle | Yes | Main nav, module menu, light/dark. Header becomes a sticky bar. The menu opens on click, not hover. The theme choice is remembered. |
| Mega menu featured release card | No | What's new lives in the footer and on home. |
| Mobile menu as a card under the header | Yes | Mobile menu with expandable module group and theme row |
| Hero with two CTAs | Structure only | Home: heading, search field, top tasks. No illustration. Search is the one primary action. |
| Hero product panels, orb | No | |
| Product cards with icon tiles | Yes | Module cards and template cards. Bordered cards with a radius replace the shared-border cells. |
| Feature rows (icon tile, title, one line) | Yes | Install steps, "where things live" on the start page |
| Section head with one action on the right | Yes | Section heading plus one action ("Download all logos") |
| Split layout (copy beside visual) | Yes | Logo helper and signature generator beside their previews |
| Security cells (two-column shared-border grid) | Yes | Do and don't rule grids on guide pages |
| Code tabs (language switch) | Yes | Copy-format tabs: SVG / PNG / HEX / RGB, rebuilt as ARIA tabs with keyboard support |
| Integration pills | Yes | Filter pills on icons and templates, as `aria-pressed` toggles without color dots |
| Changelog cards with tags | Yes | What's new entries, tags: Added, Updated, Retired. Kept as rows. Cover-image article cards dropped. |
| FAQ | Yes | Install help on fonts and signature pages. Native `details`, icon motion cut to 200ms. |
| Footer columns | Yes | Module links, brand contact, version |
| Footer newsletter form, oversized wordmark | No | |
| Pricing tiers | No | |
| Stats row | No | |
| Customer logo strip | No | |
| Customer story cards | No | |
| Small labels above headings | No | Headings stand alone. Uppercase menu group labels become sentence-case headings. |
| Two-tone headings (accent second line) | No | One color per heading |
| Dark bands inside the light page | No | One theme per page, chosen by the viewer |
| Frame rules on the content edges | No | Space alone separates sections |
| Horizontal scroll strips on mobile | No | Card grids stack |
| Scroll-triggered reveals, looping animations | No | Motion only on input |
| Orb, glowing pixel-mosaic art, voice widget, decorative product UI | No | Real asset previews are the imagery |
| Announcement pill ("New") | No | What's new link in footer and home |

## 8. Banned list

From `STANDARDS.md`, as it applies to the components above:

- Glows, orbs, aurora or mesh gradients, and blurred color blobs behind content. This covers the header, hero, cards, and dialog backdrops.
- Glassmorphism and frosted panels. The header, menus, dialog, sheet, and toast use solid `--color-surface`, and the scrim is solid.
- Gradient text in any heading or button.
- Decorative sparkle or star icons, including in icon tiles and empty states.
- Pill-shaped "New" badges above the hero heading, and promo cards in menus.
- Headline labels above headings. Section heads start with the heading.
- Animated counters and stat rows without real data.
- Logo walls of customers who do not exist.
- Floating 3D shapes, isometric blobs, and generic abstract illustrations. Card previews show real assets only.
- Fake product UI used as decoration.
- Parallax and scroll-jacking, including reveal-on-scroll.
- Motion longer than 200ms, or motion that runs without user input (except a loading state).
- Emoji in UI text, including toasts and empty states.
- Hard-coded hex in components. Every color, font, radius, and spacing value comes from a token.
- More than one accent role per screen. `--color-primary` marks the one primary action. Links use `--color-link`. Everything else is neutral.
