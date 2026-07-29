# DESIGN.md — "The Exhibition" visual world

THESIS: A one-person exhibition. The shipped artifacts hang like works in a private
gallery and the visitor walks the collection. Refuses the startup-portfolio default
(uniform card grid with meta rows).

OWN-WORLD: Gallery wall — pure white ground (light), after-hours gallery near-black
(dark). Works are large images with thin neutral outlines, hung with real wall spacing
on ONE centered axis (no breakouts, nothing juts). Under each work a placard: work
title (bold), a "medium, year" line in italic gray, one plain sentence, then an
"On view" row of live external links. Numbers appear as wall labels (mono, tabular).
Hairline datum rules mark room boundaries. One grotesk family (Hanken Grotesk
Variable); italics reserved for medium lines; mono reserved for data.

STORY: A founder scrolls the rooms, realizes every piece is live and made by one
person, and reaches the enquiries line at the end: write to me.

FIRST VIEWPORT: Exhibition wall text: name large, two-sentence statement at reading
measure, contact row. The first room label and the headline work (Ozan) enter below.

## Durable rules
- Containers: one axis. `--hall` 64rem centered for everything; text blocks cap at
  `--measure` 44rem but stay on the same centered axis (margin-inline auto inside hall
  is FORBIDDEN for text: text is centered as a block, i.e., the measure column is
  itself centered — matching the works' center line).
- Rooms: h2 room label (1.05rem, 650, letterspacing normal) + full-hall hairline.
- Works: image (outline oklch 0/1 alpha .08/.1, radius 4px — gallery frames are
  square-ish), shadow only on hover (offset+blur), placard gap 1.1rem below image.
- Placard: title 1.35rem/680 · medium line italic var(--soft) 1rem · sentence 1.02rem
  · on-view row 0.95rem links with ↗.
- Scale rhythm per room: headline work full-hall; pair works 2-up; trio works 3-up.
  Never a uniform grid of same-size cards across rooms.
- Type scale: body 1.0925rem/1.66; h1 wall text clamp(2.6rem…3.4rem)/700 tracking
  -0.02em; page titles 2.35rem.
- Color: strictly neutral + link blue (#1f56c3 / #86a9f5). No accent colors. Images
  carry all color.
- Motion: one authored moment — works settle in on scroll (CSS animation-timeline:
  view(), translateY 14px + opacity, exp ease-out; no-op where unsupported / reduced
  motion). Interactive transitions: specified properties only, cubic-bezier(0.2,0,0,1).
- Dark mode: walls #0f1011, text #ececea, outlines white-alpha. Same grammar.
- Mono (Fragment Mono) only for: dates, stats, wall labels. Never headings/labels.
- Prohibited: breakout widths, section numbering, uppercase-tracked eyebrows,
  border-left accents, gradient text, glass blur decoration.
