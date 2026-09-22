# Hideal — website

> Design D (`v4.*`) is the production site and is branded **Hideal**.
> Designs A, B and C are earlier experiments and still say Cozy Studio.

Static site. No build step, no dependencies.

**The same business, rendered in more than one design.** Each design owns its own
HTML/CSS/JS trio and shares nothing but the `assets/` folder, so you can edit or
delete any one of them without touching the others.

| | Files | Look |
|---|---|---|
| **A — original** (`index.html`) | `index.html`, `styles.css`, `script.js` | Warm cream ground, serif display face, blue accent, split hero with a product mockup |
| **B — alternate** (`studio.html`) | `studio.html`, `studio.css`, `studio.js` | Off-white ground, hairline grid with crosshair marks, near-black ink, one hot-orange accent, centred hero |
| **C — third** (`v3.html`) | `v3.html`, `v3.css`, `v3.js` | Structure and visual language modelled on [family.co](https://family.co): pure white ground, huge centred display headings, pill buttons, floating pastel confetti, portrait device frames bleeding out of soft pastel panels |
| **D — fourth** (`v4.html`) | `v4.html`, `v4.css`, `v4.js` | Structure and visual language modelled on [agentation.com](https://www.agentation.com): a documentation manual — warm off-white ground, sticky top bar, one 576px reading column, dense 13/14px Inter with the key phrase in red, hairlines instead of boxes, and blue links |

Each page links to the others from its footer ("Original design" / "Alternate design" /
"Third design" / "Fourth design"). Delete those lines if you don't want them cross-linked.

**The copy is identical across designs.** B, C and D say nothing A doesn't — no invented
locations, office clocks, client counts, testimonials, blog posts or extra service
bullets. If you add a claim to one page, add it to the others or leave it off all
of them.

Design A uses New Kansas (falling back to Instrument Serif) + Inter.
Design B uses **DM Sans** for display and **Inter** for body copy.
Design C uses **Figtree** for display and **Inter** for body copy.
Design D uses **Inter** for everything, over the system monospace face for meta
lines. `--display` and `--sans` both resolve to Inter; the display face is set
apart by size, weight and tighter tracking rather than a second family, so the
page loads from one origin (Google Fonts).
All of those load from Google Fonts, so there's nothing to license or self-host.

To preview: double-click `index.html`, or run a local server:

```bash
python3 -m http.server 4000
```

## 1. Set your email address

Open `script.js` (design A), `studio.js` (design B), `v3.js` (design C) or `v4.js`
(design D). All four take the same two settings at the top of the file — if you're running more than one
page, set them in each:

```js
const STUDIO_EMAIL  = "hello@cozy.studio";
const FORM_ENDPOINT = "";
```

`STUDIO_EMAIL` is used by the contact form, the footer link and the "Prefer email?"
line — change it in this one place and all three update.

## 2. Make the contact form deliver

**As shipped (`FORM_ENDPOINT = ""`)** the form validates the input, then opens the
visitor's mail client with every field pre-filled and addressed to you. This works
with zero setup, but it depends on the visitor having a mail client configured.

**For real submissions**, sign up for a form service and paste the endpoint in:

```js
const FORM_ENDPOINT = "https://formspree.io/f/YOUR_ID";
```

The form then POSTs JSON in the background and shows an inline success message.
Anything that accepts a JSON POST works — Formspree, Basin, Getform, Web3Forms,
Netlify Forms, or your own endpoint. No other change is needed.

The form already includes a hidden honeypot field that silently absorbs naive bots.

## 3. Things you'll probably want to change

| What | Where |
|---|---|
| Colors, fonts, radii, shadows | `:root` block at the top of `styles.css` |
| "Taking on 2 new projects this quarter" | hero `<p class="badge">` in `index.html` |
| Stats row (2–6 wks / 4 / Figma) | `<ul class="hero__meta">` |
| Engagement names | `<section id="engage">` |
| FAQ questions | `<section id="faq">` |
| LinkedIn / X links | footer, `data-social` links |

### Design B only (`studio.html` / `studio.css`)

| What | Where |
|---|---|
| Palette, fonts, radii | `:root` block at the top of `studio.css` |
| Hero strip (three claims) | `<div class="strip">` in `studio.html` |
| Stat counters (48 / 4 / 1 / 0) | `data-count` attributes in the dark About section |
| Numbered service rows | `<div class="rows">` in `studio.html` |
| Section order | B has no FAQ — its sections mirror the reference layout: hero, scope grid, about, services, process, pricing, contact |
| The crosshair `+` corner marks | `.cross` spans inside any `.framed` block |

### Design C only (`v3.html` / `v3.css`)

| What | Where |
|---|---|
| Palette, fonts, radii, section rhythm | `:root` block at the top of `v3.css` |
| Email address | `STUDIO_EMAIL` at the top of `v3.js` — it writes every `data-email` link |
| Floating hero confetti | `.hero__deco .b1`–`.b12` in `v3.css`; the same block is reused in the closing CTA |
| Browser mockups | `.dev` markup in `v3.html` — a chrome bar, sidebar and main column, drawn entirely in CSS with no images. Skeleton vocabulary is `.sk`, `.dev__card`, `.dev__tile`, `.dev__chart` |
| Scrolling chip row | `[data-marquee]`; `v3.js` duplicates the authored children so the loop is seamless. Edit the chips once |
| Price | the `.plan` card in `#pricing` and the contact section's bullet. Design D is on `$6,000`; designs A, B and C still say `$3,000` |
| Plan card | `.plan` — an outer card whose 5px padding frames a tinted inset `.plan__panel` holding the checklist, with the figure below it on the card's own ground. The footer's 16px side padding matches the panel's, so the label lines up with the panel title and the button with the panel's right edge. Structure modelled on [wireframe.co/pricing](https://wireframe.co/pricing) |
| Contact form | `#contact` — same three fields, validation, honeypot and delivery paths as design A, wrapped in the closing "Explore Cozy" CTA rather than its own section |

### Design D only (`v4.html` / `v4.css`)

| What | Where |
|---|---|
| Palette, fonts, metrics | `:root` block at the top of `v4.css` — `--col` is the 576px reading column, `--rail` the sidebar. One grey, `--muted`, covers every piece of secondary text; nothing on the page is set below 12px |
| Email address | `STUDIO_EMAIL` at the top of `v4.js` — it writes every `data-email` link and the form's mailto fallback |
| Nav items | `<header class="nav">` in `v4.html` — a sticky top bar with three links: About (goes to the deliverables), Pricing and Get in touch. Anything carrying `data-spy="<section id>"` is tracked by the scroll-spy in `v4.js` |
| Hero call to action | `<div class="cta">` — the button reuses the shared `.btn` style, so it stays in step with the form's submit |
| Smooth anchor scrolling | `scroll-behavior:smooth` on `html` in `v4.css`, inside a `prefers-reduced-motion:no-preference` guard; `scroll-margin-top` on `.doc > section` keeps targets clear of the sticky top bar |
| Availability line | `<span class="avail">` beside the "Let's chat" button in the hero |
| The accented phrase in the title | `<span class="hl">` in the `<h1>`; the colour is `--accent` |
| Product mockup | the `.win` block — chrome bar, rail, header buttons, stat cards, chart and table rows, drawn in CSS with no images. Vocabulary: `.sk` skeleton bars, `.ui--ghost` / `.ui--cta` buttons, `.tile` + `.chip` stat cards, `.row` + `.av` + `.status` table rows |
| The demo's build animation | the `build` keyframes in `v4.css`. Every piece of the mockup shares one animation on one clock (`--dur`, 16s); each has a `--d` saying when it arrives. Retime everything from `--dur`, or move one piece with its `--d`. The chart's stroke draws separately via `draw-line` |
| The assistant panel | `<aside class="ai">` inside the mockup — 20% of the width, sliding in from the right. Its beats are written as plain percentages of `--dur` rather than `--d` offsets, so the times read directly: panel in, prompt typed (`ai-type`, stepped so it looks like characters), sent (`ai-send`), thinking (`ai-thinking`), reply streams (`ai-line`) |
| What the prompt changes | `ai-flash` rings the chart and `.row--new` lands tinted in the table (`ai-row`, `ai-row-tint`). The new row holds its space from the start, so the dashboard never reflows when it appears. Move these two windows together with the reply's, or the cause-and-effect stops reading |
| FAQ open/close | `slide()` in `v4.js`. `<details>` has no transition of its own, so the height is animated by hand — including the body's bottom padding, or a border-box height of 0 still leaves that padding behind and the collapse visibly stalls |
| List rules in `.doc` | `.doc ol` / `.doc ul` / `.doc li` are all (0,1,1) and will beat a bare class like `.cards` or `.card`, silently reimposing the 16px indent, the disc marker and 2px item padding. Any list styled by class inside the column must be scoped `.doc .thing` to win — and any media-query override of it needs the same prefix, since media queries add no specificity |
| Deliverable cards | `<ul class="cards">` — a tinted panel per deliverable, each holding a small animation drawn in the same skeleton vocabulary as the hero. One clock (`--cdur`, 11s); `--cd` on each `<li>` staggers the four so the grid cascades, `--d` on each piece orders it within its panel. **If you change either, keep the rule:** everything must finish exiting before the first card restarts, so the tail after `pop`'s 78% (22% of `--cdur`) has to be longer than the largest `--cd + --d` in the grid. Get that wrong and the last card is still leaving when the first one comes back. The panels are `.wire` (dashed blocks), `.sys` (tokens then components), `.hifi` (the top-left corner of a dashboard, zoomed so it crops off the panel's right and bottom, flipping from blocked-out to finished UI at 32–43% of the clock via `hf-block` / `hf-ink` / `hf-btn` / `hf-logo` / `hf-navon` / `hf-appear`) and `.proto` (a tap, a drawn link, the next screen) |
| Section order | hero, mockup, deliverables, process, pricing, contact, FAQ, cross-links |
| Where the nav tightens | the `max-width:560px` media query in `v4.css` closes the gaps so three links still fit |

## 4. Deploying

Drag the folder onto [Netlify Drop](https://app.netlify.com/drop), or push it to a
GitHub repo and enable Pages. There's nothing to compile.

Before going live, replace `assets/og.png` (the social share image, 1200×630) — it's
referenced in the `<head>` but not included yet, so link previews will be blank until
you add it.

## Notes on what's deliberately absent

- **No client logos or testimonials.** You don't have clients yet, and invented ones
  are a liability. The FAQ answers "you don't show any client work, why?" head-on
  instead — that reads better than a missing section.
- **The hero mockup is abstract**, drawn in CSS and SVG. It suggests a dashboard
  without pretending to be a real product you shipped.
