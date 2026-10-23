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

## Visual

Banned patterns:

- Glows, orbs, aurora or mesh gradients, and blurred color blobs behind content
- Glassmorphism panels and frosted cards
- Gradient text
- Decorative sparkle or star icons
- Pill-shaped "New" badges above the hero heading
- Animated counters and stat rows with no real data
- Logo walls of customers who do not exist
- Floating 3D shapes, isometric blobs, and generic abstract illustrations
- Fake product UI used as decoration
- Parallax and scroll-jacking
- Motion longer than 200ms, or motion that runs without user input (except a loading state)
- Emoji in UI text

Required:

- Brand tokens drive every color, font, radius, and spacing value. No hard-coded hex in components.
- One accent role per screen. Restraint over decoration.
- Real previews of real assets. The asset is the imagery.
- `prefers-reduced-motion` removes all non-essential motion.
- WCAG 2.2 AA: 4.5:1 body text, 3:1 large text and UI parts, visible focus on every control, full keyboard operation, 24px minimum target size.

## Documentation

- Write docs as engineering documentation for a person maintaining the project.
- State what a thing does and how to change it. No marketing tone in the README.
- No credit or attribution lines naming tools, models, or assistants.
