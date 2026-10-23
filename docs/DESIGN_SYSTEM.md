# Design system

This document defines the shell of the Brand Hub engine for release 0.2: color, type, spacing, radius, layout, components, frosted glass, the hero gradient, motion, states, iconography, and copy. The shell is identical for every brand. Its tokens live in `src/theme/` and brands cannot override them. `ENGINE_SPEC.md`, section 10, describes how the engine reads the few values it takes from brand data.

Conventions:

- Sizes are given in px for reading. Ship them as `rem` (16px base).
- Media queries are mobile first (`min-width`).
- Token names in this document match the CSS custom properties: `bg` is `var(--bg)`, `radius-lg` is `var(--radius-lg)`.

## 1. Shell and brand

The engine owns the interface. The brand shows up only as content.

| Owned by the engine | Comes from brand data |
|---|---|
| Page background, surfaces, text, borders, and control colors | Logos and their files |
| Focus ring, success, and danger colors | Colors and their values (HEX, RGB, CMYK, PMS) |
| Interface fonts: Mona Sans and Martian Mono | Brand fonts, shown as specimens on `/fonts` |
| Spacing, radius, shadows, motion, and layout | Icons, photos, templates, and rules |
| Frosted glass surfaces | The hue of the home hero gradient (`tokens.color.primary`, or `hero.tint`) |
| Navigation labels: Library, Brand guide, Create | The brand name and mark in the top bar |

Rules:

- Build every shell element from shell tokens. Never read a brand's colors or fonts into a control, a surface, or the navigation.
- The one place brand color appears inside a shell control is the color dot on a chip that names that color.
- Brand fonts appear only on the Fonts page, in specimens, the type tester, and previews. A variable brand font may respond to the cursor there.

## 2. Color

Light is the default theme. The site follows the system setting, and the theme toggle in the top bar overrides it.

How to use the roles:

- Set every page on `bg`. Use `surface-subtle` for the sidebar, hover rows, and the wells that hold asset previews. Use `surface-raised` for cards, dialogs, and toasts.
- Set text in `text`, supporting copy in `text-secondary`, and dates, sizes, and hints in `text-muted`. All three pass 4.5:1 on every surface in both themes.
- Draw hairlines with `border`. Give every control boundary `border-control` (3:1 or better) so inputs and secondary buttons stay visible without a fill.
- Use `fill-primary` with `on-primary` for one primary action per view. It is ink, never brand color.
- `focus` is the only saturated color the shell owns. It draws the 2px focus ring, offset 2px, on every interactive element.
- `success` and `danger` always travel with an icon and a word.

### Light

| Token | Value | Usage |
|---|---|---|
| `bg` | `#ffffff` | Page background behind everything. Never tinted with brand color. |
| `surface-subtle` | `#f5f6f8` | Sidebar, search field at rest, hover rows, and wells that hold previews. |
| `surface-raised` | `#ffffff` | Cards, popovers, the search dialog, and toasts. Matches `bg` and relies on `border`. |
| `border` | `#e6e8ec` | Default 1px hairline: card edges, dividers, the header's bottom rule. Never the only boundary of a control. |
| `border-strong` | `#cdd1d8` | Card border on hover and selected states, table rules that need more weight. |
| `border-control` | `#7f858f` | Boundary of inputs, secondary buttons, and chips. 3:1 on `bg`, `surface-subtle`, and `surface-raised`. |
| `text` | `#0b0d10` | Headings, body copy, labels, and values. |
| `text-secondary` | `#4e545e` | Supporting copy, card descriptions, inactive nav items. 7:1 or better on every surface. |
| `text-muted` | `#6a707b` | Captions, file sizes, dates, and input hints. 4.6:1 or better on every surface. |
| `fill-primary` | `#0b0d10` | The one primary button per view. |
| `fill-primary-hover` | `#2a2e35` | Hover and pressed state of `fill-primary`. |
| `on-primary` | `#ffffff` | Text and icons on `fill-primary`. |
| `focus` | `#2f6bff` | Focus ring. 4.5:1 on `bg`. |
| `success` | `#1a7f52` | Copied and downloaded confirmations, with the check icon and a word. |
| `danger` | `#c93a3a` | Editor errors and failed downloads, with a word. |
| `scrim` | `rgba(10, 11, 13, 0.45)` | Backdrop behind the search dialog and the mobile menu. |
| `glass-fill` | `rgba(255, 255, 255, 0.6)` | Frosted fill for the hero search field and chips. Never below 55%, so text holds 4.5:1 over the darkest point of any tuned mesh. |
| `glass-fill-strong` | `rgba(255, 255, 255, 0.72)` | Frosted fill for the scrolled top bar, the mobile tab bar, the search dialog, and toasts. |
| `glass-border` | `rgba(255, 255, 255, 0.7)` | Edge of a frosted surface. Paired with `border` on the top bar's bottom edge. |
| `glass-highlight` | `rgba(255, 255, 255, 0.75)` | 1px inset top line on frosted surfaces, drawn as an inset box shadow. |

### Dark

| Token | Value | Usage |
|---|---|---|
| `bg` | `#0a0b0d` | Page background behind everything. |
| `surface-subtle` | `#111317` | Sidebar, search field at rest, hover rows, and preview wells. |
| `surface-raised` | `#16181d` | Cards, popovers, the search dialog, and toasts. Steps up from `bg`. |
| `border` | `#23262d` | Default 1px hairline. Never the only boundary of a control. |
| `border-strong` | `#343841` | Card border on hover and selected states. |
| `border-control` | `#5f6570` | Boundary of inputs, secondary buttons, and chips. 3:1 on every surface. |
| `text` | `#f2f3f5` | Headings, body copy, labels, and values. |
| `text-secondary` | `#a6acb6` | Supporting copy, card descriptions, inactive nav items. 7.8:1 or better on every surface. |
| `text-muted` | `#8a909b` | Captions, file sizes, dates, and input hints. 4.6:1 or better on every surface. |
| `fill-primary` | `#f2f3f5` | The one primary button per view. |
| `fill-primary-hover` | `#d9dce1` | Hover and pressed state of `fill-primary`. |
| `on-primary` | `#0b0d10` | Text and icons on `fill-primary`. |
| `focus` | `#7aa2ff` | Focus ring. 7.9:1 on `bg`. |
| `success` | `#4cc38a` | Copied and downloaded confirmations, with the check icon and a word. |
| `danger` | `#f07070` | Editor errors and failed downloads, with a word. |
| `scrim` | `rgba(0, 0, 0, 0.6)` | Backdrop behind the search dialog and the mobile menu. |
| `glass-fill` | `rgba(22, 24, 29, 0.6)` | Frosted fill for the hero search field and chips. |
| `glass-fill-strong` | `rgba(22, 24, 29, 0.75)` | Frosted fill for the scrolled top bar, the mobile tab bar, the search dialog, and toasts. |
| `glass-border` | `rgba(255, 255, 255, 0.08)` | Edge of a frosted surface. |
| `glass-highlight` | `rgba(255, 255, 255, 0.06)` | 1px inset top line on frosted surfaces. |

## 3. Type

The interface uses two families, both self-hosted under the SIL Open Font License:

| Family | Token | Stack | Use |
|---|---|---|---|
| Mona Sans | `font-sans` | `"Mona Sans", system-ui, sans-serif` | All interface text. |
| Martian Mono | `font-mono` | `"Martian Mono", ui-monospace, Menlo, monospace` | Only values people copy: HEX, RGB, CMYK, PMS, and file names. |

### Styles

| Style | Family | Size | Line height | Weight | Tracking | Usage |
|---|---|---|---|---|---|---|
| `display-xl` | sans | 56px | 1.02 | 600 | -0.03em | Home hero title from 992px. One per page. |
| `display` | sans | 40px | 1.05 | 600 | -0.03em | Home hero title below 992px, and Brand guide chapter openers. |
| `h1` | sans | 32px | 1.1 | 600 | -0.025em | Page title on every Library, Brand guide, and Create page. |
| `h2` | sans | 24px | 1.2 | 600 | -0.02em | Section heads within a page. |
| `h3` | sans | 18px | 1.3 | 600 | -0.01em | Subsections and rule titles in the Brand guide. |
| `body-lg` | sans | 18px | 1.55 | 400 | 0 | Page intros. One paragraph at most. |
| `body` | sans | 16px | 1.55 | 400 | 0 | Default copy. 16px minimum so it reads on a phone outdoors. |
| `small` | sans | 14px | 1.5 | 400 | 0 | Card descriptions, help text, and download format labels. |
| `label` | sans | 14px | 1.4 | 500 | 0 | Buttons, nav items, chips, and card titles. |
| `caption` | sans | 12px | 1.4 | 500 | 0.01em | Dates, counts, and keyboard hints. Never for anything a person must act on. |
| `value` | mono | 13px | 1.5 | 400 | 0 | HEX, RGB, CMYK, PMS, and file names people copy. Never for labels or decoration. |
| `value-sm` | mono | 11px | 1.5 | 400 | 0 | Secondary values under a swatch or file card. |

Rules:

- Headings use weight 600 with the negative tracking set in their style. Text uses 400 and 500 only.
- Nothing sits directly above a heading. A heading stands on its own.

## 4. Spacing

Space on the 4px scale.

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Icon to label gap inside chips. |
| `space-2` | 8px | Icon to label in buttons, gap between chips. |
| `space-3` | 12px | Card gap between preview and text. |
| `space-4` | 16px | Card padding, phone gutter, grid gap below 768px. |
| `space-5` | 24px | Grid gap from 768px, tablet gutter. |
| `space-6` | 32px | Section head to content. |
| `space-7` | 48px | Between sections on phones, sidebar to content. |
| `space-8` | 64px | Between sections on desktop, desktop gutter. |
| `space-9` | 96px | Hero block padding on desktop. |

Separate sections with space alone: `space-7` on phones, `space-8` on desktop. No alternating background bands.

## 5. Radius, borders, and depth

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 6px | Keyboard hints, small swatch dots, tags. |
| `radius-md` | 10px | Buttons, inputs, the search field, sidebar items, toasts. |
| `radius-lg` | 14px | Cards, preview wells, the search dialog. |
| `radius-pill` | 999px | Chips only. |

- Cards use a `border` hairline and `radius-lg`. Cards have no resting shadow.
- `shadow-popover` is for the search dialog, menus, and toasts only.

| Token | Light | Dark |
|---|---|---|
| `shadow-popover` | `0 1px 2px rgba(11, 13, 16, 0.06), 0 12px 32px rgba(11, 13, 16, 0.10)` | `0 1px 2px rgba(0, 0, 0, 0.5), 0 12px 32px rgba(0, 0, 0, 0.55)` |

## 6. Layout

| Token | Value | Usage |
|---|---|---|
| `header-h` | 56px | Height of the top bar: brand name and mark, top tabs, search, theme toggle. |
| `sidebar-w` | 248px | Sidebar width from 992px. |
| `content-max` | 1200px | Width of the content column beside the sidebar. |
| `reading-max` | 68ch | Maximum line length for Brand guide prose. |

The page has three parts on every route, the home page included:

- **Top bar.** Sticky, `header-h` tall. Holds the brand name and mark, the three tabs, the search trigger, and the theme toggle.
- **Sidebar.** `sidebar-w` wide, on `surface-subtle`, with a `border` on its right edge. It lists the categories of the current tab.
- **Content column.** Runs to `content-max`, `space-7` from the sidebar.

### Breakpoints

| Range | Gutter | Navigation | Hero title |
|---|---|---|---|
| Below 768px | `space-4` | Tabs become a segmented control under the top bar. The sidebar becomes a horizontally scrolling chip row. The mobile tab bar is frosted. | `display` |
| 768px to 991px | `space-5` | Tabs in the top bar. The sidebar is still a chip row under the tabs. | `display` |
| 992px and up | `space-8` | Tabs in the top bar. Sidebar at `sidebar-w`. | `display-xl` |

- Card grids stack on small screens. They never become horizontal scroll strips. The phone category chip row is the only exception.
- Grid gap is `space-4` below 768px and `space-5` from 768px.
- The home hero sits inside the content column and stays about 320px tall, so the "Quick downloads" row shows above the fold on a laptop.

## 7. Components

Each component lives in `src/components/` and reads only shell tokens.

### AssetCard

An asset card shows the real asset and lets someone take it without opening a detail page. It takes the rendered asset, a title, one line on where the asset is used, and its download formats.

- The well is `surface-subtle`, 150px tall, and renders the actual file. Never an icon standing in for it.
- Title in `label`. Use line in `small` and `text-secondary`. File size in `value-sm`.
- Actions are always visible. Hover only adds a 2px lift and `border-strong`. Touch and keyboard users see the same actions.
- No type label above the title. The sidebar and page title already say what it is.

### Button

Buttons run an action on the asset in front of the person: download, copy, open. A button takes a verb-first label of one to three words and an optional leading icon.

- Primary: `fill-primary` with `on-primary`, one per view. It is ink, never the brand's color, so it reads the same for every brand.
- Secondary: `bg` with a `border-control` boundary, for every other action.
- Ghost: for low-weight links such as "View rules".
- Name downloads by use when the format is not obvious: "For Word and PowerPoint" with "PNG" in `small` beside it.
- Height 40px, 32px for the small size. Radius `radius-md`. Hover and press change color over `duration-fast`.
- Never disabled. Keep it active and explain on use.

### Chip

Chips are quick picks under the hero search and filters above a grid. A chip takes a short label, an optional icon or color dot, and `aria-pressed` when it filters.

- Pill shape (`radius-pill`), 32px tall, `border-control` boundary on `bg`.
- Hero quick picks are frosted (`glass-fill`). Filter chips above grids stay solid.
- A selected filter chip uses `fill-primary` and `on-primary`.
- A color dot uses the brand color it names.
- Labels say what someone came for ("Logo for slides"), not the asset's internal name.

### ColorSwatch

A swatch shows one brand color and every value someone might need, each copyable with one click. It takes the color, its name, and its values.

- The color block shows the brand's real value. This is brand content, not shell.
- Each value row is labeled by use: Web (HEX), RGB, Print (CMYK), and Sign (PMS). Values in `value`, labels in `caption`.
- Clicking a row copies its value and shows a toast naming the color and value: "Comet Green #1E5B4A copied".

### Hero

The home hero puts search first: the brand's name, a large search field, and four quick picks, over a slow grain mesh tuned from the brand's colors. It takes the brand name, the brand's primary color (or a `hero.tint` override), four quick-pick assets, and real asset names for the search hint.

- It sits inside the content column beside the sidebar, about 320px tall.
- Title in `display-xl` from 992px and `display` below, on two lines: "<Brand>" then "brand files". Nothing above it.
- The search field is the hero size of SearchField. Its hint types out real asset names from the brand's data and stops under reduced motion.
- Quick picks are chips naming what people come for: "Logo for slides", the primary color, "Font files", the most used template.
- The search field and chips are frosted (section 8), and solid under reduced transparency.
- The mesh follows the hero gradient rules in section 9.
- On phones the title drops to two short lines, the search goes full width, and the chips wrap to two rows.

### SearchField

Search is the main action on the home page and one keystroke away everywhere else. The field takes hint text that shows a real query and the platform's shortcut.

- Hero size: 52px tall, up to 480px wide, `bg` with a `border-control` boundary, `body` text. Frosted (`glass-fill`) in the home hero, solid everywhere else.
- Header trigger: 36px, `surface-subtle`, opens the search dialog. Shows ⌘K on Mac and Ctrl K elsewhere. The engine detects the platform and never shows both.
- The hint cycles through real asset names from the brand's data (Try "horizontal logo") and stops cycling under reduced motion.
- Results open in a frosted dialog (`glass-fill-strong`, `shadow-popover`) over `scrim`, full screen below 768px.

### Sidebar

The sidebar lists the categories of the current top tab and shows on every page, the home page included. It takes items with a label, an icon from the engine set, an optional count, and the current page.

- Width `sidebar-w`, `surface-subtle` ground, `border` on the right edge.
- Item: 36px tall, `label` style, `text-secondary`. Current item: `bg` with an inset `border` ring and `text`.
- The first Library item is "All files", which is the home page and is current on `/`. It uses the `home` icon, a house outline on the same 24px grid.
- Counts in `caption` and `text-muted`. Links that leave the hub, such as Photos, have no count.
- Below 992px the sidebar becomes a horizontally scrolling chip row under the top tabs.

### Toast

A toast confirms a copy or a download by naming exactly what happened. It takes the asset name and the value or file.

- Frosted: `glass-fill-strong`, `glass-border`, `shadow-popover`, `radius-md`. The check icon uses `success`. The words carry the meaning.
- Text pattern: "<name> <value> copied" or "<file> downloaded".
- Enters over `duration-base` with `ease-out`, stays 3 seconds, and uses `role="status"`.

### TopTabs

The top bar holds the brand name, three intent tabs, search, and the theme toggle. It takes the current section. Each tab switches the sidebar's contents.

- Library: get a file or a value. Brand guide: learn how to use the brand. Create: make something with your own details on it.
- The engine fixes the labels. No other tabs and no request button.
- Active tab: `text` with a 2px `text` underline on the header's bottom rule. Inactive: `text-secondary`.
- Sticky. At rest it is `bg`. Once the page scrolls it turns frosted (`glass-fill-strong`) with a `border` bottom edge, over `duration-base`.
- Height `header-h`. Below 768px the tabs become a segmented control under the bar.

## 8. Frosted glass

Glass appears only where something sits or moves behind it. It is used in exactly four places:

| Surface | Fill |
|---|---|
| The hero search field and quick-pick chips, over the mesh | `glass-fill` |
| The top bar, once the page has scrolled (plain `bg` at rest) | `glass-fill-strong` |
| The search dialog and toasts, with `shadow-popover` | `glass-fill-strong` |
| The mobile tab bar | `glass-fill-strong` |

Every frosted surface is built the same way:

```css
background: var(--glass-fill); /* or --glass-fill-strong */
backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
border: 1px solid var(--glass-border);
box-shadow: inset 0 1px 0 var(--glass-highlight);
```

| Token | Value | Usage |
|---|---|---|
| `glass-blur` | 14px | Backdrop blur radius for every frosted surface. Never raise it: blur cost grows with radius. |
| `glass-saturate` | 1.4 | Backdrop saturation boost so the brand tint behind frosted surfaces stays visible. |

- Never put glass on cards, the sidebar, grids, or anything with nothing behind it.
- Never brighten the hero mesh to make glass more visible.
- No refractive glass effects. Safari and Firefox cannot render them, so most phones would never see them.
- Fall back to solid `surface-raised` under `@supports not (backdrop-filter: blur(1px))` and under `prefers-reduced-transparency: reduce`.

## 9. Hero gradient

The home hero carries the only gradient in the engine: a grain mesh built from the brand's colors. It is a React island in `src/hero/`.

### Tuning steps

The engine tunes the brand's colors instead of using them raw:

1. Take the brand's primary color (`tokens.color.primary` in `brand.json`) and keep only its hue. If its OKLCH chroma is under 0.03, use the most saturated color in the palette instead.
2. Build three tones in OKLCH: at that hue, at the hue plus about 35 degrees, and at the hue minus about 28 degrees. Lock lightness between 0.88 and 0.94 and keep chroma between 0.035 and 0.07.
3. A brand with no color above chroma 0.03 (black, white, grey) gets a cool neutral instead.
4. In dark theme, mix each tone about 80% toward `bg` so the mesh stays a tint, not a glow.
5. `hero.tint` in `brand.json` overrides the tuning with up to three exact colors. Use it only when a client asks for a specific look.

Never default to a blue and purple gradient. Every hub would look the same.

### Placement and rendering

- The mesh stays inside the content column, top right. It fades out under the hero text and toward the bottom, so the title, search, and chips always sit on near-`bg` ground. The sidebar never carries the gradient.
- Film grain at about 5% keeps it from reading as a stock gradient.
- It drifts slowly: a full cycle takes well over a minute.
- It renders one still frame under reduced motion, when WebGL is missing, and when the tab is hidden or the hero is offscreen.
- It loads after the page renders and never blocks search.

### Contour preset

`hero.preset: "contour"` swaps the mesh for a field of hairline contours drawn in `text`, with one brand-colored line in five. Use it for brands whose palette is very loud or nearly monochrome.

## 10. Motion

| Token | Value | Usage |
|---|---|---|
| `duration-fast` | 120ms | Hover, press, focus, and color changes. |
| `duration-base` | 200ms | Dialog open, toast in, card lift, copy check swap. |
| `duration-slow` | 320ms | Filter reflow and page content crossfade. Nothing in the interface runs longer. |
| `ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Everything entering or settling. No bounce, no overshoot. |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Things that move between two resting places, such as the filter reflow. |

- Cards lift 2px and move to `border-strong` on hover.
- Copy buttons swap their icon for a check, then show a toast.
- Filtered grids move items to their new positions instead of jumping.
- No fade-up sections on scroll, no parallax, no glows, no blur-in headings.
- Under `prefers-reduced-motion`, transitions are instant and the hero holds still.

## 11. States

| State | Treatment |
|---|---|
| Hover | `surface-subtle` behind ghost and secondary controls. `fill-primary-hover` on primary. |
| Focus | The `focus` ring, 2px with a 2px offset, on every interactive element. Always visible on keyboard focus. |
| Selected | Sidebar: `bg` with an inset `border` ring. Filter chips: `fill-primary`. |
| Disabled | Not used. Keep the control active and explain on use. |

Empty, loading, and error states follow the copy rules in section 13: say what is missing or what went wrong, and name the thing.

## 12. Iconography

- Shell icons come from the engine's own set in `src/lib/ui-icons.ts`: a 24px grid, round caps and joins, drawn in `currentColor`.
- Render at 16px or 18px with a 1.75px stroke, and at 20px in the search field.
- Shell icons are always one color, inherited from the text beside them.
- Brand icons are content. They live in the brand's data and show in the brand's colors on the Icons page.
- No emoji anywhere in the shell.

## 13. Copy

People open the hub to get something, learn a rule, or make something. Every label answers one of those jobs in plain words.

- Sentence case everywhere: "Download PNG", "Brand guide".
- Name things by use, not by format or internal type. Write "For Word and PowerPoint" with "PNG" beside it, not "Raster export". Color rows read Web, RGB, Print, and Sign.
- The navigation vocabulary is fixed: Library, Brand guide, Create. The home row is "Quick downloads". The engine version never appears on public pages.
- Nothing above a heading. No small labels over section titles, no type tags above card titles.
- No em dashes. No exclamation marks in system copy. No "successfully", "please", "simply", or "easy".
- Confirmations name the thing: "Comet Green #1E5B4A copied", "logo-horizontal.png downloaded".
- Search hints show a real query from the brand's own data: Try "horizontal logo".
- The home hero title is "<Brand> brand files". Search and quick picks carry the rest. No subline.
- The home page is the Library's first sidebar item, "All files". No landing page sits in front of the library.
