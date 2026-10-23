# Design and copy standards

These rules apply to the engine, the demo brand, every brand instance, and all documentation. `npm run check` enforces the parts a script can catch. Review catches the rest.

## Copy

- No em dashes. Use a period, comma, or colon.
- No headline labels above headings (small uppercase "section" text). A heading stands on its own.
- No filler: "seamless," "elevate," "unlock," "game-changer," "cutting-edge," "effortless," "world-class," "all-in-one," and similar. Say the specific thing.
- No invented content. No made-up stats, quotes, dates, customer names, or project details. If real content is missing, remove the slot.
- No authorship or tool credit lines in the UI, docs, code comments, or commit messages.
- Plain labels over clever ones. "Logos," not "Brand marks." "Fonts," not "Typography system."
- Front-load the key word. Short sentences. Active verbs.
- Buttons say what happens: "Download SVG," "Copy hex," "Open in Canva." Never "Learn more" or "Get started" alone.
- Copy feedback names the thing copied: "Navy hex #0F3D6B copied."
- Each person's name and title appear in their own wording.

### Redesign copy and layout

- No short text label directly above a heading. A line of four words or fewer placed right before an `h1`, `h2`, or `h3` counts as a label, whatever its styling.
- Name downloads by use, with the format beside the label: "For Word and PowerPoint (PNG)", "For print and web (SVG)".
- Label color values Web, RGB, Print, and Sign.
- The home row is called "Quick downloads". Do not label it by usage until the site collects download counts.
- The engine version never appears on public pages.

## Visual

No decorative visuals. The asset is the imagery. Release 0.2 allows a few narrow exceptions, listed under each rule.

### Gradients

- No gradients, except the single home hero gradient defined in `ENGINE_SPEC.md`, section 10: tuned from the brand, pale, with grain, and faded under the text.
- No glows, orbs, aurora effects, or blurred color blobs behind content.
- No blue-to-purple gradients.
- No gradient text, buttons, cards, or borders.

### Glass

- Frosted surfaces appear only in the four places listed in `ENGINE_SPEC.md`, section 6: the hero search field and chips, the top bar after the page scrolls, the search dialog and toasts, and the mobile tab bar.
- Blur is 14px at most. Frosted surfaces turn solid under `prefers-reduced-transparency` and where `backdrop-filter` is unsupported.
- No refraction effects. No glass cards or panels anywhere else.

### Motion

- Interface motion runs 120 to 320ms, with no bounce.
- The only motion that runs without user input is the hero gradient drift and the search placeholder typing. Both pause when offscreen or when the tab is hidden, and both hold still under `prefers-reduced-motion`.
- No scroll-triggered fades, parallax, scroll-jacking, or blur-in headings.

### Color

- The engine owns every shell value through its tokens: surfaces, text, borders, controls, focus, status colors, spacing, radius, motion, and layout.
- Brand data drives content only (logos, swatches, fonts, icons, templates) and the hero hue.
- No hard-coded visual values in components.

### Other banned patterns

- Decorative sparkle or star icons
- Pill-shaped "New" badges above the hero heading
- Animated counters and stat rows with no real data
- Logo walls of customers who do not exist
- Floating 3D shapes, isometric blobs, and generic abstract illustrations
- Fake product UI used as decoration
- Emoji in UI text

### Required

- One accent role per screen. Restraint over decoration.
- Real previews of real assets. The asset is the imagery.
- `prefers-reduced-motion` removes all non-essential motion.
- WCAG 2.2 AA: 4.5:1 body text, 3:1 large text and UI parts, visible focus on every control, full keyboard operation, 24px minimum target size.

## Documentation

- Write docs as engineering documentation for a person maintaining the project.
- State what a thing does and how to change it. No marketing tone in the README.
- No credit or attribution lines naming tools, models, or assistants.
